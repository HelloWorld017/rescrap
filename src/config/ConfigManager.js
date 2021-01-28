import fs from "fs";
import globby from "globby";
import path from "path";
import { merge } from "../utils";
import yaml from "yaml";

export const DefaultConfig = {
	locale: 'en_US',
	plugins: {},
	parsers: {},
	watching: {},
	fetch: {
		maxRetry: 3,
		timeout: 15000,

		request: {
			userAgent: '',
			retryDelay: 1000
		},

		download: {
			delay: 1000,
			path: './rescrap/downloads'
		}
	},
	logging: {
		console: {
			enabled: true,
			level: 'info'
		},

		file: {
			enabled: true,
			dest: './rescrap/logs/{datestr}.log',
			level: 'verbose'
		}
	},
	rescrap: {
		database: 'sqlite::memory:'
	},
	debug: {
		debugMode: false,
		dumpRequest: false
	}
};

export default class ConfigManager {
	constructor(rescrap) {
		this.rescrap = rescrap;
		this.logger = rescrap.logger.scope('config');
		this.files = [ '<default>' ];
		this._config = merge([ {}, DefaultConfig ]);
	}

	async initApplication() {
		await this.loadConfigs();

		this.logger.info.with('i18n')('config-load', {
			files: this.files.join(', ')
		});
	}

	async loadConfigs() {
		const configs = await globby([
			"config/*.yml"
		], {
			cwd: this.rescrap.basePath
		});

		for (const configFile of configs) {
			try {
				const configContent = await fs.promises.readFile(path.join(this.rescrap.basePath, configFile), 'utf8');
				const configName = path.basename(configFile, '.yml');
				const configValue = yaml.parse(configContent);
				this.overrideConfig(configValue);

				this.files.push(configName);
			} catch (err) {
				this.logger.error.with('i18n')(
					'config-load-failed',
					{ file: configFile },
					err
				);
			}
		}
	}

	overrideConfig(config) {
		this._config = merge([ this._config, config ]);
	}

	getConfig() {
		const getProperty = (baseObject, hookPath) => {
			return hookPath.reduce((previousObject, hookKey) => {
				if (hookKey in previousObject) {
					return previousObject[hookKey];
				}

				return undefined;
			}, baseObject);
		};

		const hookProperty = (baseObject, hookPath) => {
			return new Proxy(
				Object.create(null),
				{
					get(_, prop) {
						const propPath = [ ...hookPath, prop ];
						const targetValue = getProperty(baseObject, propPath);

						if (typeof targetValue === 'object') {
							return hookProperty(baseObject, propPath);
						}

						return targetValue;
					},

					ownKeys() {
						const hookObject = getProperty(baseObject, hookPath);
						return Reflect.ownKeys(hookObject);
					},

					getOwnPropertyDescriptor(_, prop) {
						return { value: this.get(_, prop), enumerable: true, configurable: true };
					}
				}
			);
		};

		return hookProperty(this, [ '_config' ]);
	}
}
