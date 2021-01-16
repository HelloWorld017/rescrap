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
	debug: {
		debugMode: false,
		dumpRequest: false
	}
};

export default class ConfigManager {
	constructor(rescrap) {
		this.rescrap = rescrap;
		this.logger = rescrap.logger.scope('config');
		this.files = [];
		this._config = merge([ {}, DefaultConfig ]);
	}

	async initApplication() {
		await this.loadConfigs();
	}

	async loadConfigs() {
		const configs = await globby([
			"config/*.yml"
		], {
			cwd: this.rescrap.basePath
		});

		for (const configFile of configs) {
			const configContent = await fs.promises.readFile(path.join(this.rescrap.basePath, configFile), 'utf8');
			const configName = path.basename(configFile, '.yml');
			const configValue = yaml.parse(configContent);
			this.overrideConfig(configValue);

			this.files.push(configFile);
		}
	}

	overrideConfig(config) {
		this._config = merge([ this.config, config ]);
	}

	getConfig() {
		return new Proxy(
			{},
			{
				get(_, prop) {
					if (!this.config.hasOwnProperty(prop))
						return undefined;

					return this.config[prop];
				}
			}
		);
	}
}
