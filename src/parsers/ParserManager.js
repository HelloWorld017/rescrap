import { getRecrondDir } from "../utils";
import logger as globalLogger from "../logger";
import globby from "globby";
import path from "path";
import * as recrond from "../";

class ParserManager {
	constructor() {
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
		path.join(getRecrondDir(), parserPath)

		try {
			const ParserClass = evaluate(parserPath, { recrond });

			const parserName = ParserClass.getName();
			const parserOption = config.parsers[parserName];

			const logger = globalLogger.scope(parserName);
			const fetcher = new Fetcher(
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

export default new ParserManager;
