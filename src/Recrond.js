import models, { init as initModels } from "./models";
import parsers from "./parsers";
import plugins from "./plugins";

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

		this.i18n = new I18n(this);
		this.pluginManager = new PluginManager(this);
		this.parserManager = new ParserManager(this);
	}

	initApplication() {
		await this.configManager.initApplication();
		await this.i18n.initApplication();
		await this.pluginManager.initApplication();
		await this.parserManager.initApplication();
	}

	static models = models;
	get models() { return this.constructor.models; }

	static parsers = parsers;
	get parsers() { return this.constructor.parsers; }
	
	static plugins = plugins;
	get plugins() { return this.constructor.plugins; }
}

export default Recrond;
