import ModelUnit from "../models/ModelUnit";
import { named } from "../utils";

export default class ParserBase extends named() {
	constructor(recrond, fetcher, logger) {
		super();

		this.recrond = recrond;
		this.fetcher = fetcher;
		this.logger = logger;
		this.implemented = [];
		this.options = {};
	}

	async _init(options) {
		this.options = options;
	}

	async _listUnit(data) {
		return [];
	}

	async _listFile(unit) {
		return [];
	}

	async *_listFileIterator(unit) {
		const files = await this.listFile(unit);

		for (let i = 0; i < files.length; i++) {
			const result = yield { file: files[i] };

			if (result.isRetry)
				i--;
		}
	}

	async _download(unit) {
		const iterator = await this.listFileIterator(unit);
		const fetcher = await this._getFetcherForTerminalUnit(unit);

		let retryCount = 0;
		let isRetry = false;
		let previousFetch = null;

		while (true) {
			const { value: yieldObject } = await iterator.next({ isRetry, previousFetch });
			if (yieldObject === undefined) {
				break;
			}

			const { file, ignoreError } = yieldObject;

			try {
				previousFetch = await fetcher.download(file);
				await this.postProcess(file);

				retryCount = 0;
				isRetry = false;
			} catch(err) {
				previousFetch = err;
				previousFetch.error = err;

				if (this.recrond.config.debug.debugMode)
					this.logger.debug('Error while downloading file', err);

				if (isRetry && !ignoreError)
					retryCount++;

				if (retryCount > 5) {
					iterator.return();
					throw err;
				}

				isRetry = true;
			}
		}

		try {
			await fetcher.commit();
		} catch(err) {
			this.logger.error("Failed to commit staging folders!", err);
			throw err;
		}

		const terminal = await unit.getTerminal();
		terminal.downloaded = true;

		await terminal.save();
	}

	async _postProcess(file) {

	}

	async _getFetcherForTerminalUnit(unit) {
		return this.fetcher.scopeStage(unit);
	}

	async getRootUnit() {
		const [ unit ] = await ModelUnit.findOne({
			where: { id: this.name }
		});

		return unit;
	}

	init(...args) {
		return this.recrond.pluginManager
			.execute(this, 'parser/init', args, this._init.bind(this));
	}

	listUnit(...args) {
		return this.recrond.pluginManager
			.execute(this, 'parser/listUnit', args, this._listUnit.bind(this));
	}

	download(unit, globalFetcher) {
		const terminal = await unit.getTerminal();
		if (!terminal || terminal.downloaded) return;

		const ancestors = await unit.getAncestors();
		const fetcher = ancestors.reduce(
			(fetcher, ancestor) => fetcher.scopeDirect(ancestor),
			globalFetcher
		);

		return this.recrond.pluginManager
			.execute(this, 'parser/download', [ unit, globalFetcher ], this._download.bind(this));
	}

	listFileIterator(...args) {
		return this.recrond.pluginManager
			.execute(this, 'parser/listFileIterator', args, this._listFileIterator.bind(this));
	}

	postProcess(...args) {
		return this.recrond.pluginManager
			.execute(this, 'parser/postProcess', args, this._postProcess.bind(this));
	}
}
