import { init as initModels } from "./models";

class Recrond {
	constructor({
		sequelize,
		basePath
	}) {
		this.basePath = basePath;
		this.sequelize = sequelize;

		initModels(this.sequelize);

		this.loggerManager = new RecrondLogger(this);
		this.logger = this.loggerManager.createLogger();

		this.configManager = new ConfigManager(this);
		this.config = this.configManager.getConfig();

		this.pluginManager = new PluginManager(this);
		this.parserManager = new ParserManager(this);
	}

	initApplication() {
		await this.configManager.readConfigs();
		await this.pluginManager.readPlugins();
		await this.parserManager.readParsers();
	}
}
