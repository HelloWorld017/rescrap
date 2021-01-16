import * as models,		initModels from "./models";
import * as commands,	CommandManager from "./commands";
import * as parsers,	ParserManager from "./parsers";
import * as plugins,	PluginManager from "./plugins";

import ConfigManager from "./config";
import Fetcher from "./fetcher";
import I18n from "./i18n";
import Logger from "./logger";
import PromisePool from "es6-promise-pool";
import { Sequelize } from "sequelize";

class Rescrap {
	constructor({
		basePath = "./rescrap"
	}) {
		this.basePath = basePath;

		this.loggerManager = new Logger(this);
		this.logger = this.loggerManager.createLogger();

		this.configManager = new ConfigManager(this);
		this.config = this.configManager.getConfig();

		this.i18nManager = new I18n(this);
		this.i18n = this.i18nManager.createI18n();
		this.logger.addModifier('i18n', this.i18nManager.createLoggerModifier());

		this.sequelize = new Sequelize(this.config.rescrap.database);
		initModels(this.sequelize);

		this.fetcher = new Fetcher(this);
		this.pluginManager = new PluginManager(this);
		this.parserManager = new ParserManager(this);
	}

	initApplication() {
		await this.configManager.initApplication();
		await this.i18nManager.initApplication();
		await this.pluginManager.initApplication();
		await this.parserManager.initApplication();
		this.logger.finish.with('i18n')('rescrap-init');
	}

	findUpdates(parserName, dataItems) {
		const parser = this.parserManager.parsers.get(parserName);
		const updates = [], errors = [];

		const concurrency = parser.options.parallelUnits || this.config.rescrap.parallelUnits;
		const logger = this.logger.scope('updates');

		const promiseGenerator = function* () {
			for (const dataItem of dataItems) {
				const itemName = typeof dataItem === 'object' ?
					dataItem.name :
					`${dataItem}`;

				const promise = (async () => {
					const unitIterator = await parser.fetchUnits(dataItem);

					let units;
					while (true) {
						const { done, value } = unitIterator.next();
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
		this.logger.progress.with('i18n')(
			'rescrap-fetch-finish',
			{ parserName, updates: finishedCount }
		);

		return { finished: updates, finishedCount, errors };
	}

	downloadUpdates(parserName, updatedUnits) {
		const parser = this.parserManager.parsers.get(parserName);
		const downloaded = [], errors = [];

		const concurrency = parser.options.parallelUnits || this.config.rescrap.parallelUnits;
		const logger = this.logger.scope('download');

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
