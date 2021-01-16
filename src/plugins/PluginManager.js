import { evaluate } from "../utils";
import globby from "globby";
import path from "path";

export default class PluginManager {
	constructor(rescrap) {
		this.rescrap = rescrap;
		this.logger = rescrap.logger.scope('plugins');
		this.config = rescrap.config;
		this.plugins = new Map();
		this.events = new Map();
	}

	async initApplication() {
		await this.loadPlugins();
	}

	registerPlugin(plugin) {
		this.plugins.set(plugin.name, plugin);
		this.logger.info.with('i18n')('plugin-load', { pluginName: plugin.name });
	}

	registerEvent(eventName, callback) {
		if (!this.events.has(eventName)) {
			this.events.set(eventName, []);
		}

		this.events.get(eventName).push(callback);
	}

	async execute(parser, eventName, args, callback) {
		const events = (this.events.get(eventName) || [])
			.concat((...[, , args]) => callback(...args));

		const next = i => args =>
			Promise.resolve(events[i + 1](parser, eventName, args, next(i + 1)));

		return next(0)(args);
	}

	async loadPlugins() {
		const plugins = await globby([
			"plugins/*.js",
			"plugins/*/index.js"
		], {
			cwd: this.rescrap.basePath
		});

		for (const pluginPath of plugins) {
			await this.loadPlugin(path.join(this.rescrap.basePath, pluginPath));
		}
	}

	async loadPlugin(pluginPath) {
		try {
			const PluginClass = await evaluate(pluginPath, { rescrap: this.rescrap });

			const pluginName = PluginClass.getName();
			const pluginOption = this.config.plugins[pluginName] ?? {};
			const logger = this.rescrap.logger.scope(pluginName);

			const plugin = new PluginClass(this.rescrap, logger);
			await plugin.install(pluginOption);
			this.registerPlugin(plugin);

			return true;
		} catch(err) {
			this.logger.error.with('i18n')('plugin-load-failed', { pluginPath }, err);
			return false;
		}
	}
}
