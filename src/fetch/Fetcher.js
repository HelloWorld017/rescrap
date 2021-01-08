import config from "../config";
import logger as globalLogger from "../logger";
import utils from "../utils";

class Fetcher {
	constructor(
		downloadPath = getDownloadDir(),
		options = { ...config.fetch },
		logger = globalLogger
	) {
		this.downloadPath = downloadPath;
		this.stageTargetPath = null;

		this.globalLogger = logger;
		this.logger = this.globalLogger.scope('fetcher');
		this.options = options;
		this.unit = null;

		this.axios = axios.create({
			timeout: this.options.timeout
		});
	}

	async $(uri, req) {
		return await this.request({ uri }, req);
	}

	async request(...req) {
		// TODO
		return new Promise((resolve, reject) => {
			request(this.mergeRequest(
				Object.assign({ uri }, obj)
			), (err, resp, body) => {
				if(err) {
					if(count < this.options.request.maxConnectRetry && err.message === 'read ECONNRESET') {
						this.$(uri, obj, getResponse, count + 1)
							.then(resolve)
							.catch(reject);

						return;
					}

					return reject(err);
				}

				if(config.debug.dumpRequest)
					fs.writeFileSync(`./dumps/${Date.now()}.txt`, util.inspect(resp));

				resolve(getResponse ? resp : body);
			});
		});
	}

	async ensureDest() {
		await fs.promises.mkdir(this.downloadPath, { recursive: true });
		return this;
	}

	_scope(unit, newPath, options = {}) {
		const newLogger = this.globalLogger.scope(unit.name);
		const newOptions = { ...this.options, ...options };
		const newFetcher = new Fetcher(newPath, newOptions, newLogger);
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

			const { data: respStream, retryCount } = response;
			destStream = respStream;
			retry += retryCount;

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
