import { getRecrondDir } from "../utils";
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

	async init() {
		const parsers = await globby([
			"parsers/*.js",
			"parsers/*/*.parser.js"
		], {
			cwd: getRecrondDir()
		});

		for (const parserPath of parsers) {
			await loadParser(path.join(getRecrondDir(), parserPath));
		}
	}

	async loadParser(parserPath) {
		try {
			const ParserClass = evaluate(
				path.resolve(this.recrond.getDirectory(), parserPath),
				{ recrond: this.recrond }
			);

			const parserName = ParserClass.getName();
			const parserOption = this.config.parsers[parserName];

			const logger = globalLogger.scope(parserName);
			const fetcher = new Fetcher(
				this.recrond,
				parserOption.fetch,
				logger
			);

			const parser = new ParserClass(fetcher, logger);
			this.parsers.set(parserName, parser);

			logger.info(`Loaded parser: ${parserName}`);
			return true;
		} catch(err) {
			logger.error(`Failed to load parser: ${parserPath}`, err);
			return false;
		}
	}
}
