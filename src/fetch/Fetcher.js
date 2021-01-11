import axios from "axios";
import { axiosRetry, isRetryableError } from "axios-retry";
import fs from "fs";
import { merge, sleep } from "../utils";
import mergeConfig from "axios/lib/core/mergeConfig";
import util from "util";

class Fetcher {
	static UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36'

	constructor(recrond, options, logger) {
		this.recrond = recrond;
		this.options = options || { ...recrond.config.fetch };

		this.globalLogger = logger || recrond.logger;
		this.logger = this.globalLogger.scope('fetcher');

		this.downloadPath = options.download.path;
		this.stageTargetPath = null;

		this.unit = null;

		this.axios = axios.create({
			headers: {
				'User-Agent': this.options.request.UserAgent || Fetcher.UserAgent
			},

			timeout: this.options.timeout
		});

		axiosRetry(this.axios, {
			retries: this.options.maxRetry,
			shouldResetTimeout: true,
			retryCondition: error => isRetryableError(error) || error.code === 'ECONNABORTED',
			retryDelay: count => count * this.options.request.retryDelay
		});
	}

	async $(uri, req) {
		return await this.request({ uri }, req);
	}

	async request(...reqs) {
		const mergedConfig = req.reduce(
			(base, config) => mergeConfig(base, config),
			{}
		);

		try {
			const response = await this.axios(mergedConfig);
			if(this.recrond.config.debug.dumpRequest) {
				await fs.promises.mkdir('./dumps', { recursive: true });
				await fs.promises.writeFile(`./dumps/${Date.now()}.txt`, util.inspect(resp));
			}

			return response;
		} catch (err) {
			throw err;
		}
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

		const newFetcher = new Fetcher(newOptions, newLogger);
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

	async download(req, file, retry = 0) {
		if(!this.unit)
			throw new Error("Fetcher not scoped!");

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

			promises.push(new Promise((resolve, reject) => {
				promisePipe(
					destStream,
					fs.createWriteStream(path.join(this.downloadPath, file.dest))
				)
				.then(resolve)
				.catch(reject);
			}));

			if (this.options.timeout)
				promises.push(new Promise((resolve, reject) => {
					setTimeout(() => {
						reject(
							new Error(`Request timeout while downloading ${this.unit.name} > ${file.id}`)
						);
					}, this.options.timeout * 1000);
				}));

			await Promise.race(promises);
			await file.save();

			this.logger.verbose(`Downloaded ${this.unit.name} > ${file.id}`);
		} catch(err) {
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

			this.logger.debug(`Error downloading ${this.unit.name} > ${file.id}`, err);
			await this.download(req, file, retry);
		}

		await sleep(this.options.download.delay);
		return { request, response };
	}

	async commit() {
		if (!this.stageTargetPath)
			return;

		await fs.promises.rename(this.downloadPath, this.stageTargetPath);
		this.downloadPath = this.stageTargetPath;
		this.stageTargetPath = null;
	}
}

export default Fetcher;
