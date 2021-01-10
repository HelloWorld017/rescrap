export default class PluginManager {
	constructor() {
		this.plugins = new Map();
		this.events = new Map();
	}

	registerPlugin(plugin) {
		this.plugins.set(plugin.name, plugin);
	}

	registerEvent(eventName, callback) {
		if (!this.events.has(eventName)) {
			this.events.set(eventName, []);
		}

		this.events.get(eventName).push(callback);
	}

	async execute(parser, eventName, args, callback) {
		const events = (this.events.get(eventName) ?? [])
			.concat((...[, , args]) => callback(...args));

		const next = i => args =>
			Promise.resolve(events[i + 1](parser, eventName, args, next(i + 1)));

		return next(0)(args);
	}
}
