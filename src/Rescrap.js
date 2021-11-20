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

import { ModelUnit, ModelRun, ModelTerminal } from "./models";
import { Sequelize, Op } from "sequelize";

import sequelizeLogger from "sequelize/lib/utils/logger";
import { bulkUpsertAndReturn, chunkArray, getLatestUserAgent, upsertAndReturn } from "./utils";

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

	async destroy() {
		await this.loggerManager.destroy();
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

				let transaction;
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
						const hasUnsupportedKey = Array.isArray(value)
							? value.some(valueItem => typeof valueItem.key !== 'string')
							: typeof value.key !== 'string';

						if (hasUnsupportedKey) {
							const unitKey = JSON.stringify(
								Array.isArray(value)
									? value.find(valueItem => typeof valueItem.key !== 'string').key
									: value.key !== 'string'
							);

							logger.warn.with('i18n')('rescrap-unit-has-unsupported-key', { unitKey });
						}

						if (done) {
							units = value;
							break;
						}

						if (Array.isArray(value)) {
							for (const unitsChunked of chunkArray(value, 20)) {
								upsertedUnit = await bulkUpsertAndReturn(rescrap, ModelUnit, unitsChunked);
							}
						} else {
							upsertedUnit = await upsertAndReturn(rescrap, ModelUnit, value);
						}
					}

					// Make terminal unit models
					transaction = await rescrap.sequelize.transaction();

					const updatedUnits = [];
					for (const unitsChunked of chunkArray(units, 20)) {
						const upsertedUnits =
							await bulkUpsertAndReturn(rescrap, ModelUnit, unitsChunked, { transaction });

						const sanitizedUnits = upsertedUnits.filter(value => value !== undefined);
						if (sanitizedUnits.length !== upsertedUnits.length) {
							logger.warn.with('i18n')('rescrap-unit-upsert-error');
						}

						 updatedUnits.push(...sanitizedUnits);
					}
					const updatedUnitIds = updatedUnits.map(unit => unit.id);

					const terminals = await ModelTerminal.findAll({
						where: {
							unitId: {
								[ Op.in ]: updatedUnitIds
							}
						},
						transaction
					});
					const terminalByUnitIds = new Map();
					terminals.forEach(terminal => terminalByUnitIds.set(terminal.unitId, terminal));

					const unitsWithoutTerminal = updatedUnits.filter(unit => !terminalByUnitIds.get(unit.id));
					await ModelTerminal.bulkCreate(
						unitsWithoutTerminal.map(unit => ({
							unitId: unit.id,
							downloaded: false
						})),
						{ transaction }
					);

					await transaction.commit();
					transaction = null;

					const updatesPerItem = updatedUnits.filter(unit => {
						const terminal = terminalByUnitIds.get(unit.id);
						return !terminal?.downloaded;
					});

					// Finish
					logger.verbose.with('i18n')(
						'rescrap-fetch-units',
						{ parserName, item: itemName, updates: updatesPerItem.length }
					);

					updates.push(updatesPerItem);

				})().catch(async err => {
					if (transaction) {
						try {
							await transaction.rollback();
						} catch {}
					}

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
