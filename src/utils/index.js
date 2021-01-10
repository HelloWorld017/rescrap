import fs from "fs";
import path from "path";
import vm from "vm";

export * from "./db";
export * from "./filesystem";
export * from "./promise";

export default function named(BaseClass = Object) {
	return class Named extends BaseClass {
		constructor(...args) {
			super(...args);
			this.name = this.constructor.getName();
		}

		static getName() {
			return '';
		}
	};
}

export default function evaluate(filePath, context) {
	const fileName = path.basename(filePath);

	const fileContent = await fs.promises.readFile(filePath, 'utf8');
	const script = new vm.Script(content, { filename: fileName });

	const exportModule = { exports: {} };

	parserScript.runInNewContext({
		require,
		console,
		module: exportModule,
		exports: exportModule.exports,
		...context
	});

	return exportModule.exports;
}
