import logger as globalLogger from "../logger";
import globby from "globby";
import path from "path";

export default class ParserManager {
	constructor(rescrap) {
		this.config = rescrap.config;
		this.logger = rescrap.logger;
		this.rescrap = rescrap;
		this.parsers = new Map();
	}

	async initApplication() {
		await this.loadParsers();
	}

	async loadParsers() {
		const parsers = await globby([
			"parsers/*.js",
			"parsers/*/index.js"
		], {
			cwd: this.rescrap.basePath
		});

		for (const parserPath of parsers) {
			await loadParser(path.join(this.rescrap.basePath, parserPath));
		}
	}

	async loadParser(parserPath) {
		try {
			const ParserClass = evaluate(parserPath);

			const parserName = ParserClass.getName();
			const parserOption = this.config.parsers[parserName] ?? {};

			const logger = globalLogger.scope(parserName);
			const fetcher = new Fetcher(
				this.rescrap,
				parserOption.fetch,
				logger
			);

			const parser = new ParserClass(this.rescrap, fetcher, logger);
			this.parsers.set(parserName, parser);

			this.logger.info.with('i18n')('parser-load', { parserName });
			return true;
		} catch(err) {
			this.logger.error.with('i18n')('parser-load-failed', { parserPath }, err);
			return false;
		}
	}
}
