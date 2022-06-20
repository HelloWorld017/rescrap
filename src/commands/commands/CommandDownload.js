import Command from "../Command";

export default class CommandDownload extends Command {
	constructor(rescrap) {
		super(rescrap, rescrap.i18n.t('command-download-description'));
	}

	getCommand(program) {
		return program
			.arguments('<parser> [dataItems...]')
			.description(this.description);
	}

	async execute(parser, dataItems, cmd) {
		await this.rescrap.startRun();

		const { finished: updates, errors: updateErrors } = await this._runJob(
			'update',
			logger => this.rescrap.findUpdates(parser, dataItems, logger),
		);

		const { finished: downloads, errors: downloadErrors } = await this._runJob(
			'download',
			logger => this.rescrap.downloadUpdates(parser, updates.flat(), logger),
		);

		await this.rescrap.finishRun();

		return { updates, updateErrors, downloads, downloadErrors };
	}

	async _runJob(name, jobFn) {
		const rescrap = this.rescrap;
		const logger = rescrap.logger.scope(name);

		logger.time.with('i18n')(name, `command-download-${name}-start`);
		const result = await jobFn(logger);

		logger.timeEnd.with('i18n')(name, `command-download-${name}-end`);
		logger.finish.with('i18n')(
			`command-download-${name}-finish`,
			{ finished: result.finishedCount, errors: result.errors.length }
		);

		return result;
	}

	static getName() {
		return "download";
	}
}
