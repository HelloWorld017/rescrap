import util from 'util';

export const LogLevel = {
	VERBOSE: 0,
	DEBUG: 1,
	INFO: 2,
	WARN: 3,
	ERROR: 4,
	NOLOG: 5
};

export class Logger {
	constructor(scope = []) {
		this.tags = this.getStaticTags();
		this.handlers = [];
		this.scopeValues = scope;
	}

	getStaticTags() {
		return {
			verbose: {
				level: LogLevel.VERBOSE,
				label: 'Verbose',
				styles: [ 'italic', 'gray' ]
			},

			debug: {
				level: LogLevel.DEBUG,
				label: 'Debug',
				styles: [ 'gray' ],
				badge: '-'
			},

			info: {
				level: LogLevel.INFO,
				label: 'INFO',
				styles: [ 'bgCyan' ],
				badge: '＊'
			},

			warn: {
				level: LogLevel.WARN,
				label: 'WARNING',
				styles: [ 'bgYellow', 'black' ],
				badge: '!'
			},

			error: {
				level: LogLevel.ERROR,
				label: 'ERROR',
				styles: [ 'bgRed' ],
				badge: '×'
			},

			timeStart: {
				level: LogLevel.INFO,
				label: 'START',
				styles: [ 'bgGreen', 'black' ],
				badge: '▶'
			},

			timeEnd: {
				level: LogLevel.INFO,
				label: 'END',
				styles: [ 'bgRed' ],
				badge: '■'
			}
		};
	}

	buildContentString(args) {
		return args.map(v => {
			return (typeof v === 'object' && v !== null)
				? `\n${util.inspect(v, { depth: Infinity, colors: true })}`
				: v
		}).join(' ');
	}

	log(tagName, ...args) {
		const logObject = {
			tag: this.tags[tagName],
			content: this.buildContentString(args),
			time: new Date(),
			scope: this.scopeValues
		};

		this.handlers.forEach(handler => handler.write(logObject));
	}

	addHandler(handler) {
		this.handlers.push(handler);
	}

	createLogger() {
		const timers = new Map();

		return {
			time: (key, ...args) => {
				timers.set(key, Date.now());
				this.log('timeStart', ...args);
			},

			timeEnd: (key, ...args) => {
				const time = timers.get(key);
				let timeString;

				if (time !== undefined) {
					const elapsed = Date.now() - time;
					timers.delete(key);

					if (elapsed >= 1000 * 60)
						timeString = (elapsed / (1000 * 60)).toFixed(2) + 'm';

					else if (elapsed >= 1000)
						timeString = (elapsed / 1000).toFixed(2) + 's';

					else
						timeString = (elapsed) + 'ms';

				} else {
					timeString = 'Not initialized';
				}

				this.log('timeEnd', ...args, `(${timeString})`);
			},

			scope: (...scopeTags) => {
				const nextScope = this.scopeValues.concat(scopeTags);

				const nextLogger = new this.constructor(nextScope);
				this.handlers.forEach(handler => nextLogger.addHandler(handler));

				return nextLogger.createLogger();
			},

			...Object.fromEntries(
				Object.keys(this.tags).map(k => [ k, (...args) => this.log(k, ...args) ])
			)
		};
	}
}
