import initModels,		* as models from "./models";
import CommandManager,	* as commands from "./commands";
import ParserManager,	* as parsers from "./parsers";
import PluginManager,	* as plugins from "./plugins";

import ConfigManager from "./config";
import Fetcher from "./fetch";
import I18n from "./i18n";
import Logger, { LogLevel, HandlerConsole, HandlerFile, HandlerQueue } from "./logger";
import PromisePool from "es6-promise-pool";

import { ModelUnit } from "./models";
import { Sequelize } from "sequelize";

import sequelizeLogger from "sequelize/lib/utils/logger";
import sequelizeHierarchy from "@dataee/sequelize-hierarchy";

class Rescrap {
	constructor(config = {}) {
		this.basePath = config.basePath || "./rescrap";

		this.loggerQueue = new HandlerQueue();
		this.loggerManager = new Logger();
		this.loggerManager.addHandler(this.loggerQueue);
		this.logger = this.loggerManager.createLogger();

		this.configManager = new ConfigManager(this);
		this.configManager.overrideConfig(config);
		this.config = this.configManager.getConfig();

		this.i18nManager = new I18n(this);
		this.i18n = this.i18nManager.createI18n();
		this.loggerManager.addModifier('i18n', this.i18nManager.createLoggerModifier());

		sequelizeHierarchy(Sequelize);
		sequelizeLogger.logger.warn = (...msg) => this.logger.scope('database').warn(...msg);

		this.sequelize = new Sequelize(this.config.rescrap.database, {
			logging: (...messages) => {
				this.logger.verbose(...messages.filter(msg => typeof msg === 'string'))
			}
		});
		initModels(this.sequelize);

		this.fetcher = new Fetcher(this);
		this.pluginManager = new PluginManager(this);
		this.parserManager = new ParserManager(this);
		this.commandManager = new CommandManager(this);
	}

	async initApplication() {
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

		await this.i18nManager.initApplication();
		await this.pluginManager.initApplication();
		await this.parserManager.initApplication();
		await this.commandManager.initApplication();
		this.logger.finish.with('i18n')('rescrap-init');
	}

	async findUpdates(parserName, dataItems, logger = this.logger.scope('update')) {
		const parser = this.parserManager.parsers.get(parserName);
		const updates = [], errors = [];

		const concurrency = parser.options.parallelUnits || this.config.rescrap.parallelUnits;
		logger = logger.scope(parserName);

		const promiseGenerator = function* () {
			for (const dataItem of dataItems) {
				const itemName = typeof dataItem === 'object' ?
					dataItem.name :
					`${dataItem}`;

				const promise = (async () => {
					const unitIterator = await parser.fetchUnits(dataItem);

					let units;
					while (true) {
						const { done, value } = await unitIterator.next();
						if (done) {
							units = value;
							break;
						}

						await ModelUnit.upsert(value);
					}

					const updatesPerItem = [];
					for (const unit of units) {
						const unitUpdated = await ModelUnit.upsert(unit, { returning: true });
						let terminal = await unitUpdated.getTerminal();
						if (terminal?.downloaded)
							continue;

						if (!terminal) {
							await unitUpdated.createTerminal({ downloaded: false });
						}

						updatesPerItem.push(unit);
					}

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
		const parser = this.parserManager.parsers.get(parserName);
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
	plugins
});

export default Rescrap;
