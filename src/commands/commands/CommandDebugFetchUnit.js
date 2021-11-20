import Command from "../Command";
import ModelUnit from "../../models/ModelUnit";
import { upsertAndReturn } from "../../utils/db";

export default class CommandDebugParser extends Command {
	constructor(rescrap) {
		super(rescrap, rescrap.i18n.t('command-debug-fetch-unit-description'));
	}

	getCommand(program) {
		return program
			.arguments('[parser] [dataItem]')
			.description(this.description);
	}

	async execute(parserName, dataItem, cmd) {
		throw new Error("Unimplemented command!");
		
		const logger = this.rescrap.logger.scope('debug-parser');
		const testRescrap = new this.rescrap.constructor();
		await testRescrap.init({
			rescrap: { database: 'sqlite::memory:' }
		}, false);

		const parser = testRescrap.parserManager.parsers.get(parserName);

		logger.time.with('i18n')('init', 'command-debug-fetch-unit-init-start');
		await parser.init({});
		logger.timeEnd.with('i18n')('init', 'command-debug-fetch-unit-init-end');

		logger.time.with('i18n')('fetchUnit', 'command-debug-fetch-unit-run-start');
		const unitIterator = await parser.fetchUnits(dataItem);
		let upsertedUnit;
		while (true) {
			const { done, value } = await unitIterator.next(upsertedUnit);
			if (done) {
				logger.finish.with('i18n')('command-debug-fetch-unit-finished', { unitCount: value.length });
				logger.debug(...value);
				break;
			}

			logger.progress.with('i18n')('command-debug-fetch-unit-created');
			logger.debug(value);
			upsertedUnit = await upsertAndReturn(testRescrap, ModelUnit, value);
		}

		logger.timeEnd.with('i18n')('fetchUnit', 'command-debug-fetch-unit-run-end');
	}

	static getName() {
		return "debug-fetch-unit";
	}
}
