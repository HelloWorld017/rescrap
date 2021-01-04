import { named } from "../../utils";

export default class ParserBase extends named() {
	constructor() {
		this.implemented = [];
	}

	async doInit(options) {}

	async doExpandUnit(unit, nextKeys) {
		// Upsert where parentId: unit.id, key: nextKeys
		return [];
	}

	async doListFile(unit) {
		return [];
	}

	async *doListFileGenerative(unit) {
		const files = await this.listFile(unit);

		for (let i = 0; i < files.length; i++) {
			const result = yield files[i];

			if (result.isRetry)
				i--;
		}
	}

	async doDownload(unit, fetcher) {
		const generator = await this.listFileGenerative(unit);
	}

	async doPostProcess(file) {

	}

	async init(options) {
		return PluginManager.onInit(this, options, () => {
			return await this.doInit(options);
		});
	}

	async download(unit) {
		return PluginManager.onDownload(this, unit, () => {
			return await this.doDownload(unit);
		});
	}

	async listFile(unit) {
		return PluginManager.onListFile(this, unit, () => {
			return await this.doListFile(unit);
		});
	}

	async postProcess(file) {
		return PluginManager.onPostProcess(this, file, () => {
			return await this.doPostProcess(file);
		});
	}
}
