import initModels,		* as models from "./models";
import CommandManager,	* as commands from "./commands";
import ParserManager,	* as parsers from "./parsers";
import PluginManager,	* as plugins from "./plugins";
import * as utils from "./utils";

import ConfigManager from "./config";
import Fetcher from "./fetch";
import I18n from "./i18n";
import Logger, { LogLevel, HandlerConsole, HandlerFile, HandlerQueue } from "./logger";
import PromisePool from "es6-promise-pool";

import { ModelUnit, ModelRun } from "./models";
import { Sequelize } from "sequelize";

import sequelizeLogger from "sequelize/lib/utils/logger";
import { getLatestUserAgent, upsertAndReturn } from "./utils";

class Rescrap {
	async init(config = {}, application = false) {
		this.basePath = config.basePath || "./rescrap";

		// Create default logger
		this.loggerQueue = new HandlerQueue();
		this.loggerManager = new Logger();
		this.loggerManager.addHandler(this.loggerQueue);
		this.logger = this.loggerManager.createLogger();

		// Create config manager
		this.configManager = new ConfigManager(this);
		this.configManager.overrideConfig(config);
		this.config = this.configManager.getConfig();

		// Create i18n manager
		this.i18nManager = new I18n(this);
		this.i18n = this.i18nManager.createI18n();
		this.loggerManager.addModifier('i18n', this.i18nManager.createLoggerModifier());

		// Setup config and loggers
		if (application) {
			await this.configManager.initApplication();

			if (this.config.logging.console.enabled)
				this.loggerManager.addHandler(new HandlerConsole(
					LogLevel[this.config.logging.console.level.toUpperCase()]
				));

			if (this.config.logging.file.enabled)
				this.loggerManager.addHandler(new HandlerFile(
					LogLevel[this.config.logging.file.level.toUpperCase()],
					this.config.logging.file.dest
				));

			this.loggerQueue.flush(this.loggerManager);
			this.loggerQueue = null;
		}

		// Setup database
		const databaseLogger = this.logger.scope('database');
		sequelizeLogger.logger.warn = (...msg) => databaseLogger.warn(...msg);

		this.sequelize = new Sequelize(this.config.rescrap.database, {
			logging: (...messages) => {
				databaseLogger.verbose(...messages.filter(msg => typeof msg === 'string'))
			}
		});
		this.rootUnit = await initModels(this.sequelize);

		// Create other components
		await this.fetchDefaultConstants();

		this.fetcher = new Fetcher(this);
		this.pluginManager = new PluginManager(this);
		this.parserManager = new ParserManager(this);
		this.commandManager = new CommandManager(this);

		// Setup other components
		if (application) {
			await this.i18nManager.initApplication();
			await this.pluginManager.initApplication();
			await this.parserManager.initApplication();
			await this.commandManager.initApplication();
			this.logger.finish.with('i18n')('rescrap-init');
		}

		this.currentRun = null;
	}

	async fetchDefaultConstants () {
		// Fetch User-Agent
		const fetchedUserAgent = await getLatestUserAgent();
		if (!fetchedUserAgent)
			this.logger.warn.with('i18n')('rescrap-useragent-fetch-failed');

		this.defaultUserAgent =
			fetchedUserAgent ||
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0';
	}

	async startRun() {
		this.currentRun = await ModelRun.create({ });
	}

	async finishRun() {
		this.currentRun.finish = new Date();
		await this.currentRun.save();
	}

	async findUpdates(parserName, dataItems, logger = this.logger.scope('update')) {
		if (!this.currentRun)
			throw new Error("No runs are in progress");

		const parser = this.parserManager.parsers.get(parserName);
		await this.parserManager.initParser(parser);

		const updates = [], errors = [];

		const concurrency = parser.options.parallelUnits || this.config.rescrap.parallelUnits;
		logger = logger.scope(parserName);

		const rescrap = this;
		const promiseGenerator = function* () {
			for (const dataItem of dataItems) {
				const itemName = typeof dataItem === 'object' ?
					dataItem.name :
					`${dataItem}`;

				const promise = (async () => {
					// Skip by IdentifierTag
					if (parser.implemented.includes('needsUpdate')) {
						const needsUpdate = await parser.needsUpdate();
						if (!needsUpdate) {
							logger.verbose.with('i18n')(
								'rescrap-skip-units',
								{ parserName, item: itemName }
							);
						}
					}
					
					// Fetch units
					const unitIterator = await parser.fetchUnits(dataItem);

					// Make unit models
					let units;
					let upsertedUnit;
					while (true) {
						const { done, value } = await unitIterator.next(upsertedUnit);
						if (done) {
							units = value;
							break;
						}

						upsertedUnit = await upsertAndReturn(rescrap, ModelUnit, value);
					}

					// Make terminal unit models
					const updatesPerItem = [];
					for (const unit of units) {
						const transaction = await rescrap.sequelize.transaction();
						const unitUpdated = await upsertAndReturn(rescrap, ModelUnit, unit, { transaction });

						let terminal = await unitUpdated.getTerminal();
						if (terminal?.downloaded) {
							await transaction.commit();
							continue;
						}

						if (!terminal) {
							await unitUpdated.createTerminal({ downloaded: false }, { transaction });
						}

						updatesPerItem.push(unitUpdated);
						await transaction.commit();
					}

					// Finish
					logger.verbose.with('i18n')(
						'rescrap-fetch-units',
						{ parserName, item: itemName, updates: updatesPerItem.length }
					);

					updates.push(updatesPerItem);

				})().catch(err => {
					logger.error.with('i18n')(
						'rescrap-fetch-error',
						{ parserName, item: itemName },
						err
					);

					errors.push(dataItem);
				});

				yield promise;
			}
		};

		const pool = new PromisePool(promiseGenerator, concurrency);
		await pool.start();

		const finishedCount = updates.flat().length;
		logger.progress.with('i18n')(
			'rescrap-fetch-finish',
			{ parserName, updates: finishedCount }
		);

		return { finished: updates, finishedCount, errors };
	}

	async downloadUpdates(parserName, updatedUnits, logger = this.logger.scope('download')) {
		if (!this.currentRun)
			throw new Error("No runs are in progress");

		const parser = this.parserManager.parsers.get(parserName);
		await this.parserManager.initParser(parser);

		const downloaded = [], errors = [];

		const concurrency = parser.options.parallelUnits || this.config.rescrap.parallelUnits;
		logger = logger.scope(parserName);

		const promiseGenerator = function* () {
			for (const unit of updatedUnits) {
				yield (async () => {
					await parser.download(unit);
					downloaded.push(unit);

					logger.progress.with('i18n')(
						'rescrap-download-progress',
						{ parserName, unit: unit.name }
					);
				})().catch(err => {
					logger.error.with('i18n')(
						'rescrap-download-error',
						{ parserName, unit: unit.name },
						err
					);

					errors.push(unit);
				});
			}
		};

		const pool = new PromisePool(promiseGenerator, concurrency);
		await pool.start();

		return { finished: downloaded, finishedCount: downloaded.length, errors };
	}

	static extend(extendObjects) {
		Object.keys(extendObjects)
			.forEach(key => {
				Rescrap[key] = extendObjects[key];
				Object.defineProperty(
					Rescrap.prototype,
					key,
					{ get() { return this.constructor[key]; } }
				);
			});
	}
}

Rescrap.extend({
	commands,
	models,
	parsers,
	plugins,
	utils
});

export default Rescrap;
