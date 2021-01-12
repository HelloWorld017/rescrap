import models, { init as initModels } from "./models";
import parsers from "./parsers";
import plugins from "./plugins";

class Rescrap {
	constructor({
		sequelize,
		basePath
	}) {
		this.basePath = basePath;
		this.sequelize = sequelize;

		initModels(this.sequelize);

		this.loggerManager = new RescrapLogger(this);
		this.logger = this.loggerManager.createLogger();

		this.configManager = new ConfigManager(this);
		this.config = this.configManager.getConfig();

		this.i18nManager = new I18n(this);
		this.i18n = this.i18nManager.createI18n();
		this.logger.addModifier('i18n', this.i18nManager.createLoggerModifier());

		this.pluginManager = new PluginManager(this);
		this.parserManager = new ParserManager(this);
	}

	initApplication() {
		await this.configManager.initApplication();
		await this.i18nManager.initApplication();
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

export default Rescrap;
