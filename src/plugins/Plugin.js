import { named } from "../../utils";

export default class Plugin extends named() {
	onInit(parser, args, next) {
		return next(parser, args);
	}

	onListUnit(parser, args, next) {
		return next(parser, args);
	}

	onListFile(parser, args, next) {
		return next(parser, args);
	}

	onListFileGenerative(parser, args, next) {
		return next(parser, args);
	}

	onDownload(parser, args, next) {
		return next(parser, args);
	}

	onPostProcess(parser, args, next) {
		return next(parser, args);
	}
};
