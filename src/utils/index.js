import deepmerge from "deepmerge";
import fs from "fs";
import path from "path";
import vm from "vm";

export * from "./db";
export * from "./filesystem";
export * from "./promise";

export function named(BaseClass = Object) {
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

export async function evaluate(filePath, context) {
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

export function merge(items, arrayMerge = false) {
	deepmerge(items, {
		arrayMerge: arrayMerge ?
			(target, source, options) =>
				source.reduce((dest, item) => {
					if (!dest.includes(item))
						dest.push(item);

					return dest;
				}, target.slice()) :

			(target, source, options) => source
	})
}
