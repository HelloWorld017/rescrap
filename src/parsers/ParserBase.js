import { cltRandom, named, saveOrUpdate, sleep } from "../utils";

export default class ParserBase extends named() {
	constructor(rescrap, root, fetcher, logger) {
		super();

		this.rescrap = rescrap;
		this.root = root;
		this.fetcher = fetcher;
		this.logger = logger;
		this.initialized = false;
		this.implemented = new Set();
		this.options = {};
	}

	async _init(options, context) {}

	// Should yield parent units and return all children units
	async *_fetchUnits(dataItem, context) {
		return [];
	}

	// Should return array of { file: ModelFile, req: AxiosConfiguration | Promise | ReadableStream }.
	// Can be overriden if custom listFileIterator is set
	async _listFile(unit, context) {
		return [];
	}

	// Should yield { file: ModelFile, req: AxiosConfiguration | Promise | ReadableStream, ignoreError: bool }
	async *_listFileIterator(unit, context) {
		const files = await this._listFile(unit, context);
		if (!files.length) {
			context.logger.warn.with('i18n')('parser-no-files', { name: unit.name, key: unit.key, id: unit.id });
		}

		for (let i = 0; i < files.length; i++) {
			const result = yield files[i];

			if (result.isRetry) {
				i--;
			}
		}
	}

	async _download(unit, context) {
		const { fetcher } = context;
		const iterator = await this.listFileIterator(unit, context);
		const terminal = await unit.getTerminal();

		let retryCount = 0;
		let isRetry = false;
		let previousFetch = null;
		let ignoreError = false;

		const files = [];
		while (true) {
			const { value: yieldObject } = await iterator.next({ isRetry, previousFetch });

			try {
				if (yieldObject === undefined) {
					break;
				}

				const { req, file } = yieldObject;
				ignoreError = yieldObject.ignoreError;
				
				const fileModel = this.rescrap.models.ModelFile.build(file);
				fileModel.terminalId = terminal.id;

				previousFetch = await fetcher.download(req, fileModel);
				await this.postProcess(unit, fileModel, context);
				const upsertedModel = await saveOrUpdate(this.rescrap, this.rescrap.models.ModelFile, fileModel);
				files.push(upsertedModel);

				retryCount = 0;
				isRetry = false;
				await sleep(
					(this.options.fileDelay ?? this.rescrap.config.rescrap.fileDelay) +
					cltRandom() * (this.options.fileDelayRandom ?? this.rescrap.config.rescrap.fileDelayRandom)
				);
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

		await this.postProcessUnit(unit, files, context);

		try {
			await fetcher.commit();
		} catch(err) {
			this.logger.error.with('i18n')('parser-commit-failed', {}, err);
			throw err;
		}

		terminal.runId = this.rescrap.currentRun.id;
		terminal.downloaded = true;
		await terminal.save();
	}

	async _postProcess(unit, file, context) {

	}

	async _postProcessUnit(unit, files, context) {

	}

	async _getFetcher() {
		return this.fetcher;
	}

	async _getFetcherForUnit(unit) {
		const ancestors = await unit.getAncestors();

		const fetcher = await ancestors
			.slice(2, ancestors.length - 1)
			.reduce(
				(fetcherPromise, ancestor) => fetcherPromise.then(fetcher => fetcher.scopeDirect(ancestor)),
				Promise.resolve(this._getFetcher())
			);

		return fetcher.scopeStage(unit);
	}

	async _getContext(unit = null) {
		const fetcher = unit ?
			await this._getFetcherForUnit(unit) :
			await this._getFetcher();

		const logger = fetcher.globalLogger;

		return { fetcher, logger };
	}

	async init(options, context) {
		this.initialized = true;
		this.options = options;

		return this.rescrap.pluginManager.execute(
			this,
			'parser/init',
			[ options, context ?? await this.getContext() ],
			this._init.bind(this)
		);
	}

	async fetchUnits(dataItems, context) {
		return this.rescrap.pluginManager.execute(
			this,
			'parser/fetchUnits',
			[ dataItems, context ?? await this.getContext() ],
			async (...args) => {
				const iteratorOrArray = await this._fetchUnits(...args);
				if (!Array.isArray(iteratorOrArray))
					return iteratorOrArray;

				return (async function* () { return iteratorOrArray })();
			}
		);
	}

	async listFileIterator(unit, context) {
		return this.rescrap.pluginManager.execute(
			this,
			'parser/listFileIterator',
			[ unit, context ?? await this.getContext(unit) ],
			this._listFileIterator.bind(this)
		);
	}

	async download(unit, context) {
		if (!unit) return;

		const terminal = await unit.getTerminal();
		if (!terminal || terminal.downloaded) return;

		return this.rescrap.pluginManager.execute(
			this,
			'parser/download',
			[ unit, context ?? await this.getContext(unit) ],
			this._download.bind(this)
		);
	}

	async postProcess(unit, file, context) {
		return this.rescrap.pluginManager.execute(
			this,
			'parser/postProcess',
			[ unit, file, context ?? await this.getContext(unit) ],
			this._postProcess.bind(this)
		);
	}

	async postProcessUnit(unit, files, context) {
		return this.rescrap.pluginManager.execute(
			this,
			'parser/postProcessUnit',
			[ unit, files, context ?? await this.getContext(unit) ],
			this._postProcessUnit.bind(this)
		);
	}

	async getContext(...args) {
		return this.rescrap.pluginManager
			.execute(this, 'parser/getContext', args, this._getContext.bind(this));
	}
}
