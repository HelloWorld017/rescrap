import { evaluate, merge, upsertAndReturn } from "../utils";
import globby from "globby";
import path from "path";

import { ModelUnit } from "../models";
import Fetcher from "../fetch";

export default class ParserManager {
	constructor(rescrap) {
		this.config = rescrap.config;
		this.logger = rescrap.logger.scope('parser');
		this.rescrap = rescrap;
		this.parsers = new Map();
	}

	async initApplication() {
		await this.loadParsers();
	}

	async initParser(parser) {
		if (parser.initialized) return;

		const parserName = parser.name;
		const parserOption = this.config.parsers[parserName] ?? {};

		await parser.init(parserOption);
	}

	async loadParsers() {
		const parsers = await globby([
			"parsers/*.js",
			"parsers/*/index.js"
		], {
			cwd: this.rescrap.basePath
		});

		for (const parserPath of parsers) {
			await this.loadParser(path.join(this.rescrap.basePath, parserPath));
		}
	}

	async loadParser(parserPath) {
		try {
			const ParserClass = await evaluate(parserPath, { rescrap: this.rescrap });

			const parserName = ParserClass.getName();
			const rootUnit = await upsertAndReturn(this.rescrap, ModelUnit, {
				key: parserName,
				name: parserName,
				dest: parserName,
				parentId: this.rescrap.rootUnit.id
			});

			const fetchOption = this.config.parsers[parserName]?.fetch ?? {};
			const fetcher = await (new Fetcher(
				this.rescrap,
				merge([ this.rescrap.config.fetch, fetchOption ])
			)).scopeDirect(rootUnit);

			const logger = fetcher.globalLogger;

			const parser = new ParserClass(this.rescrap, rootUnit, fetcher, logger);
			this.parsers.set(parserName, parser);

			this.logger.info.with('i18n')('parser-load', { parserName });
			return true;
		} catch(err) {
			this.logger.error.with('i18n')('parser-load-failed', { parserPath }, err);
			return false;
		}
	}
}
