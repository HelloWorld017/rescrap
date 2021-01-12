import { named } from "../../utils";

export default class Plugin extends named() {
	constructor(rescrap, logger) {
		super();

		this.rescrap = rescrap;
		this.logger = logger;
	}

	async install(pluginOption) { }
};
