import axios from "axios";
import axiosCookieJarSupport from "axios-cookiejar-support";
import axiosRetry from "axios-retry";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import util from "util";

import { isRetryableError } from "axios-retry";
import { pipeline } from "stream/promises";

import {
	copyAxiosInterceptors,
	isPromise,
	isReadableStream,
	merge,
	mergeAxios,
	sleep
} from "../utils";

const fetcherAxios = axios.create();
axiosCookieJarSupport(fetcherAxios);
axiosRetry(fetcherAxios);

export default class Fetcher {
	constructor(rescrap, options, {
		logger: globalLogger = rescrap.logger,
		axios: globalAxios = fetcherAxios
	} = {}) {
		this.rescrap = rescrap;
		this.options = options || merge([ {}, { ...rescrap.config.fetch } ]);

		this.globalLogger = globalLogger;
		this.logger = this.globalLogger.scope('fetcher');

		this.downloadPath = this.options.download.path;
		this.stageTargetPath = null;

		this.unit = null;

		this.axios = axios.create(mergeAxios(
			globalAxios.defaults,
			{
				headers: {
					'User-Agent': this.options.request.UserAgent || rescrap.defaultUserAgent
				},

				timeout: this.options.timeout,
				retries: this.options.maxRetry,
				shouldResetTimeout: true,
				retryCondition: error => isRetryableError(error) || error.code === 'ECONNABORTED',
				retryDelay: count => count * this.options.request.retryDelay,
				validateStatus: status => status < 500
			}
		));
		this.axios.interceptors = copyAxiosInterceptors(globalAxios);
	}

	async $(url, req) {
		return await this.request({
			...req,
			url
		});
	}

	async _request(...reqs) {
		const mergedConfig = mergeAxios(...reqs);

		try {
			const response = await this.axios(mergedConfig);
			if(this.rescrap.config.debug.dumpRequest) {
				await fs.promises.mkdir('./dumps', { recursive: true });
				await fs.promises.writeFile(`./dumps/${Date.now()}.txt`, util.inspect(resp));
			}

			return response;
		} catch (err) {
			throw err;
		}
	}

	async request(...args) {
		return await this.rescrap.pluginManager
			.execute(this, 'fetcher/request', args, this._request.bind(this));
	}

	async ensureDest() {
		await fs.promises.mkdir(this.downloadPath, { recursive: true });
		return this;
	}

	_scope(unit, newPath, options = {}) {
		const newLogger = this.globalLogger.scope(unit.name);
		const newOptions = merge([
			this.options,
			options,
			{ download: { path: newPath } }
		]);

		const newFetcher = new Fetcher(this.rescrap, newOptions, { logger: newLogger, axios: this.axios });
		newFetcher.unit = unit;

		return newFetcher;
	}

	async scopeDirect(unit, options = {}) {
		return this._scope(
			unit,
			path.resolve(this.downloadPath, unit.dest),
			options
		).ensureDest();
	}

	async scopeStage(unit, options = {}) {
		if (!unit.dest)
			return this.scopeDirect(unit, options);

		const destMd5 = crypto.createHash('md5').update(unit.dest).digest('hex');
		const stagePath = path.join(this.downloadPath, '.stagings', `.staging__${destMd5}`);

		const scopedFetcher = this._scope(
			unit,
			stagePath,
			options
		);
		scopedFetcher.stageTargetPath = path.resolve(this.downloadPath, unit.dest);

		return scopedFetcher.ensureDest();
	}

	async _download(downloadable, file) {
		if(!this.unit)
			throw new Error("Fetcher not scoped!");

		file.dest = sanitizeFilename(file.dest);

		let downloaded;
		try {
			if (isPromise(Promise)) {
				downloaded = await downloadable;
			} else if (isReadableStream(downloadable)) {
				downloaded = await this._downloadStream(downloadable, file);
			} else {
				downloaded = await this._downloadRequest(downloadable, file);
			}

			this.logger.verbose.with('i18n')(
				'fetcher-download-complete',
				{ unitName: this.unit.name, fileId: file.order }
			);
		} catch (err) {
			this.logger.verboseWarn.with('i18n')(
				'fetcher-download-failed',
				{ unitName: this.unit.name, fileId: file.order },
				err
			);

			throw err;
		}

		return downloaded;
	}

	async _downloadRequest(req, file, retry = 0) {
		await sleep(this.options.download.delay);

		const request = {
			...req,
			responseType: 'stream'
		};

		let response, destStream;

		try {
			response = await this.request(request);

			const { data: respStream, config: { retryCount } } = response;
			destStream = respStream;
			retry += (retryCount || 0);

			const promises = [];
			promises.push(pipeline(
				destStream,
				fs.createWriteStream(path.join(this.downloadPath, file.dest))
			));

			let onFinish = () => {};
			
			if (this.options.timeout)
				promises.push(new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(
							new Error(`Request timeout while downloading ${this.unit.name} > ${file.id}`)
						);
					}, this.options.timeout);

					onFinish = () => {
						clearTimeout(timeout);
						resolve();
					};
				}));

			await Promise.race(promises);
			onFinish();
		} catch (err) {
			if (destStream) {
				try {
					destStream.end();
				} catch {}
			}

			retry++;
			if (retry > this.options.maxRetry) {
				err.request = request;
				err.response = response;
				throw err;
			}

			return this._downloadRequest(req, file, retry);
		}

		return { request, response };
	}

	async _downloadStream(destStream, file) {
		try {
			await pipeline(
				destStream,
				fs.createWriteStream(path.join(this.downloadPath, file.dest))
			);
		} catch (err) {
			if (destStream) {
				try {
					destStream.end();
				} catch {}
			}

			throw err;
		}

		return {};
	}

	async download(...args) {
		return await this.rescrap.pluginManager
			.execute(this, 'fetcher/download', args, this._download.bind(this));
	}

	async _commit() {
		if (!this.stageTargetPath)
			return;

		await fs.promises.rename(this.downloadPath, this.stageTargetPath);
		this.downloadPath = this.stageTargetPath;
		this.stageTargetPath = null;
	}

	async commit(...args) {
		return await this.rescrap.pluginManager
			.execute(this, 'fetcher/commit', args, this._commit.bind(this));
	}
}
