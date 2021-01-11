import logger as globalLogger from "../logger";
import globby from "globby";
import path from "path";

export default class ParserManager {
	constructor(recrond) {
		this.config = recrond.config;
		this.logger = recrond.logger;
		this.recrond = recrond;
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
			cwd: this.recrond.basePath
		});

		for (const parserPath of parsers) {
			await loadParser(path.join(this.recrond.basePath, parserPath));
		}
	}

	async loadParser(parserPath) {
		try {
			const ParserClass = evaluate(parserPath);

			const parserName = ParserClass.getName();
			const parserOption = this.config.parsers[parserName] ?? {};

			const logger = globalLogger.scope(parserName);
			const fetcher = new Fetcher(
				this.recrond,
				parserOption.fetch,
				logger
			);

			const parser = new ParserClass(this.recrond, fetcher, logger);
			this.parsers.set(parserName, parser);

			this.logger.info.with('i18n')('parser-load', { parserName });
			return true;
		} catch(err) {
			this.logger.error.with('i18n')('parser-load-failed', err, { parserPath });
			return false;
		}
	}
}
