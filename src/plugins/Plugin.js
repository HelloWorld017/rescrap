import { named } from "../../utils";

export default class Plugin extends named() {
	constructor(recrond, logger) {
		super();

		this.recrond = recrond;
		this.logger = logger;
	}

	async install(pluginOption) { }
};
