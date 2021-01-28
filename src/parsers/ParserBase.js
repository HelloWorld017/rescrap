import { named } from "../utils";

export default class ParserBase extends named() {
	constructor(rescrap, fetcher, logger) {
		super();

		this.rescrap = rescrap;
		this.fetcher = fetcher;
		this.logger = logger;
		this.initialized = false;
		this.implemented = [];
		this.options = {};
	}

	async _init(options) {
		this.options = options;
	}

	// Should yield parent units and return all children units
	async *_fetchUnits(dataItem) {
		return [];
	}

	// Should return array of files (ModelFiles[]).
	// Can be overriden if custom listFileIterator is set
	async _listFile(unit) {
		return [];
	}

	// Should yield { file: ModelFile , ignoreError: bool }
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

		const files = [];
		while (true) {
			const { value: yieldObject } = await iterator.next({ isRetry, previousFetch });
			if (yieldObject === undefined) {
				break;
			}

			const { file, ignoreError } = yieldObject;

			try {
				previousFetch = await fetcher.download(file);
				await this.postProcessFile(file);
				files.push(file);

				retryCount = 0;
				isRetry = false;
			} catch(err) {
				previousFetch = err;
				previousFetch.error = err;

				if (this.rescrap.config.debug.debugMode)
					this.logger.debug.with('i18n')('parser-download-retry', {}, err);

				if (isRetry && !ignoreError)
					retryCount++;

				if (retryCount > 5) {
					iterator.return();
					throw err;
				}

				isRetry = true;
			}
		}

		await this.postProcessUnit(unit, files);

		try {
			await fetcher.commit();
		} catch(err) {
			this.logger.error.with('i18n')('parser-commit-failed', {}, err);
			throw err;
		}

		const terminal = await unit.getTerminal();
		terminal.downloaded = true;

		await terminal.save();
	}

	async _postProcess(file) {

	}

	async _postProcessUnit(unit, files) {

	}

	async _getFetcher() {
		return this.fetcher;
	}

	async _getFetcherForTerminalUnit(unit) {
		const ancestors = await unit.getAncestors();
		const fetcher = ancestors.reduce(
			(fetcher, ancestor) => fetcher.scopeDirect(ancestor),
			this._getFetcher()
		);

		return fetcher.scopeStage(unit);
	}

	async getRootUnit() {
		const { ModelUnit } = this.rescrap.models;

		const unit = await ModelUnit.findOne({
			where: { id: this.name }
		});

		return unit;
	}

	async init(...args) {
		this.initialized = true;

		return this.rescrap.pluginManager
			.execute(this, 'parser/init', args, this._init.bind(this));
	}

	async fetchUnits(...args) {
		return this.rescrap.pluginManager
			.execute(this, 'parser/fetchUnits', args, async (...args) => {
				const iteratorOrArray = await this._fetchUnits(...args);
				if (!Array.isArray(iteratorOrArray))
					return iteratorOrArray;

				return (async function* () { return iteratorOrArray })();
			});
	}

	async download(unit) {
		const terminal = await unit.getTerminal();
		if (!terminal || terminal.downloaded) return;

		return await this.rescrap.pluginManager
			.execute(this, 'parser/download', [ unit ], this._download.bind(this));
	}

	async listFileIterator(...args) {
		return this.rescrap.pluginManager
			.execute(this, 'parser/listFileIterator', args, this._listFileIterator.bind(this));
	}

	async postProcess(...args) {
		return this.rescrap.pluginManager
			.execute(this, 'parser/postProcess', args, this._postProcess.bind(this));
	}

	async postProcessUnit(...args) {
		return this.rescrap.pluginManager
			.execute(this, 'parser/postProcessUnit', args, this._postProcessUnit.bind(this));
	}
}
