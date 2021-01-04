import logger as globalLogger from "../logger";

class Fetcher {
	constructor(downloadPath, options = {}, logger = globalLogger) {
		this.downloadPath = downloadPath;
		this.stageTargetPath = null;

		this.globalLogger = logger;
		this.logger = this.globalLogger.scope('fetcher');
		this.options = {};
		this.unit = null;

		const options = {};
		if (this.options.fetch.timeout) {
			options.timeout = this.options.fetch.timeout;
		}
		this.axios = axios.create({
			timeout: this.options.timeout
		});
	}

	async $(uri, req) {

	}

	async request(...req) {
		// TODO
		return new Promise((resolve, reject) => {
			request(this.mergeRequest(
				Object.assign({uri}, obj)
			), (err, resp, body) => {
				if(err) {
					if(count < this.maxConnectRetry && err.message === 'read ECONNRESET') {
						this.$(uri, obj, getResponse, count + 1)
							.then(resolve)
							.catch(reject);

						return;
					}

					return reject(err);
				}

				if(this.request.dumpRequest)
					fs.writeFileSync(`./dumps/${Date.now()}.txt`, util.inspect(resp));

				resolve(getResponse ? resp : body);
			});
		});
	}

	async scopeDirect(unit, options = {}) {
		const newPath = path.resolve(this.downloadPath, unit.dest);
		const newLogger = this.globalLogger.scope(unit.name);
		const newOptions = { ...this.options, ...options };
		const newFetcher = new Fetcher(newPath, newOptions, newLogger);
		newFetcher.unit = unit;

		return newFetcher;
	}

	async scopeStage(unit, options = {}) {
		const originalPath = path.resolve(this.downloadPath, unit.dest);

		const destMd5 = crypto.createHash('md5').update(unit.dest).digest('hex');
		const stagePath = path.join(this.downloadPath, `.staging__${destMd5}`);

		const newLogger = this.globalLogger.scope(unit.name);
		const newOptions = { ...this.options, ...options };
		const newFetcher = new Fetcher(stagePath, newOptions, newLogger);
		newFetcher.unit = unit;
		newFetcher.stageTargetPath = originalPath;

		return newFetcher;
	}

	async download(req, file, retry = 0) {
		if(!this.unit)
			throw new Error("Fetcher not scoped!");

		let destStream;

		try {
			const { data: respStream, retryCount } = this.request({
				...req,
				responseType: 'stream'
			});
			destStream = respStream;
			retry += retryCount;

			const promises = [];

			promises.push(new Promise((resolve, reject) => {
				promisePipe(
					destStream,
					fs.createWriteStream(file.dest)
				)
				.then(resolve)
				.catch(reject);
			}));

			if (this.options.fetch.timeout)
				promises.push(new Promise((resolve, reject) => {
					setTimeout(() => {
						reject(
							new Error(`Request timeout while downloading ${this.unit.name} > ${file.id}`)
						);
					}, this.options.fetch.timeout * 1000);
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
			if (retry > this.options.fetch.maxRetry) {
				throw err;
			}

			this.logger.debug(`Error downloading ${this.unit.name} > ${file.id}`, err);
			await this.download(req, file, retry);
		}
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
