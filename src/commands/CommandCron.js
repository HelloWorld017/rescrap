export default class CommandCron extends Command {
	constructor(rescrap) {
		super()

		this.rescrap = rescrap;
		this.description = rescrap.i18n.t('command-cron-description');
	}

	getCommand(program) {
		return program
			.arguments('[parsers...]')
			.description(this.description);
	}

	async execute(parsers, cmd) {
		await this.rescrap.initApplication();

		const watchingParsers = Object.keys(this.rescrap.config.watching);
		const selectedParsers = parsers
			.reduce(
				(selected, parser) => {
					if (parser.startsWith('-')) {
						if (selected.includes(parser)) {
							selected.splice(selected.indexOf(parser), 1);
						}
					} else {
						selected.push(parser);
					}

					return selected;
				},
				(parsers[0] || '').startsWith('-') ? watchingParsers.slice() : []
			);
		
		const { finished: updates, errors: updateErrors } = await this._runJob(
			selectedParsers,
			'update',
			(...args) => rescrap.findUpdates(...args),
			parser => [ rescrap.config.watching[parser] ])
		);

		const { finished: downloads, errors: downloadErrors } = await this._runJob(
			selectedParsers,
			'download',
			(...args) => rescrap.downloadUpdates(...args),
			parser => [ updates[parser].flat() ]
		);

		return { updates, updateErrors, downloads, downloadErrors };
	}

	_runJob(selectedParsers, name, jobFn, argsFn) {
		const rescrap = this.rescrap;
		const logger = rescrap.logger;
		const concurrency = rescrap.config.rescrap.parallelParsers;

		let finished = {}, finishedCount = 0, errors = [];
		const promiseGenerator = function* () {
			for (const parser of selectedParsers) {
				yield (async () => {
					const {
						finished: parserFinished,
						finishedCount: parserFinishedCount,
						errors: parserErrors
					} = await jobFn(parser, ...argFn(parser));

					finished[parser] = parserFinished;
					finishedCount += parserFinishedCount;
					errors.push(...parserErrors);
				})();
			}
		};

		logger.time.with('i18n')(name, `command-cron-${name}-start`);

		const pool = new PromisePool(promiseGenerator, concurrency);
		await pool.start();

		logger.timeEnd.with('i18n')(name, `command-cron-${name}-end`);

		logger.finish.with('i18n')(
			`command-cron-${name}-finish`,
			{ finished: finishedCount, errors: errors.length }
		);

		return { finished, finishedCount, errors };
	}

	static getName() {
		return "cron";
	}
}
