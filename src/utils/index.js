import axios from "axios";
import base32 from "base32";
import crypto from "crypto";
import deepmerge from "deepmerge";
import fs from "fs";
import path from "path";
import vm from "vm";

import { Module } from 'module';

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
	const absPath = path.resolve(filePath);
	const fileName = path.basename(filePath);

	const fileContent = await fs.promises.readFile(absPath, 'utf8');
	const script = new vm.Script(fileContent, { filename: fileName });

	const scriptModule = new Module(absPath, module);
	scriptModule.paths = [
		...module.paths,
		...(Module._nodeModulePaths(scriptModule.path))
	].filter(
		(value, index, array) => array.indexOf(value) === index
	);

	// Create a fake require function, as node doesn't exposes internal/modules/cjs/helpers
	const scriptRequire = function require(path) {
		return scriptModule.require(path);
	};

	scriptRequire.resolve = function(request, options) {
		return Module._resolveFilename(request, scriptModule, false, options);
	};

	scriptRequire.resolve.paths = function(request) {
		return Module._resolveLookupPaths(request, scriptModule);
	};

	scriptRequire.main = process.mainModule;
	scriptRequire.extensions = Module._extensions;
	scriptRequire.cache = Module._cache;

	script.runInNewContext({
		console,
		require: scriptRequire,
		module: scriptModule,
		exports: scriptModule.exports,
		__filename: scriptModule.filename,
		__dirname: scriptModule.path,
		...context
	});

	scriptModule.loaded = true;
	return scriptModule.exports;
}

export function merge(items, arrayMerge = false) {
	return deepmerge.all(items, {
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

export function isPromise (possiblyPromise) {
	if (!possiblyPromise) return false;
	if (typeof possiblyPromise.then !== 'function') return false;

	return true;
}

export function isStream (possiblyStream) {
	if (possiblyStream === null) return false;
	if (typeof possiblyStream !== 'object') return false;
	if (typeof possiblyStream.pipe !== 'function') return false;

	return true;
}

export function isReadableStream (possiblyStream) {
	if (!isStream(possiblyStream)) return false;

	if (possiblyStream.readable === false) return false;
	if (typeof possiblyStream._read !== 'function') return false;
	if (typeof possiblyStream._readableState !== 'object') return false;

	return true;
}

export function hash (string, size = 6) {
	if (typeof string !== 'string')
		string = `${string}`;

	const buffer = crypto
		.createHash('sha256')
		.update(string)
		.digest();

	return base32.encode(buffer).slice(0, size);
}

export async function getLatestUserAgent () {
	try {
		const { data: userAgents } =
			await axios.get("https://jnrbsn.github.io/user-agents/user-agents.json");

		if (
			(!Array.isArray(userAgents)) ||
			(userAgents.length < 1) ||
			(typeof userAgents[0] !== 'string')
		)
			throw new Error("Invalid UserAgent Return!");

		return userAgents[0];
	} catch(err) {}

	return null;
}

export function chunkArray(array, size) {
	return [...Array(Math.ceil(array.length / size))]
		.map((_, index) => array.slice(index * size, (index + 1) * size));
}

export * from "./axios";
export * from "./db";
export * from "./filesystem";
export * from "./promise";
