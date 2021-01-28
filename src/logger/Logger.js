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
		this.modifiers = {};
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
				styles: [ 'cyan' ],
				badge: '＊'
			},

			warn: {
				level: LogLevel.WARN,
				label: 'WARNING',
				styles: [ 'yellow', 'underline' ],
				badge: '!'
			},

			error: {
				level: LogLevel.ERROR,
				label: 'ERROR',
				styles: [ 'red', 'underline' ],
				badge: '×'
			},

			time: {
				level: LogLevel.INFO,
				label: 'START',
				styles: [ 'green' ],
				badge: '▶'
			},

			timeEnd: {
				level: LogLevel.INFO,
				label: 'END',
				styles: [ 'red' ],
				badge: '■'
			}
		};
	}

	addModifier(modifierName, modifierFn) {
		this.modifiers[modifierName] = modifierFn;
	}

	buildContentString(args) {
		return args.map(v => {
			if (typeof v === 'object' && v !== null)
				return `\n${util.inspect(v, { depth: Infinity, colors: true })}`;

			return v;
		}).join(' ');
	}

	buildModifiedFunction(fn, prependArgsCount = 0) {
		fn.with = modifierName => {
			if (typeof this.modifiers[modifierName] !== 'function')
				return fn;

			return (...args) => {
				const prependArgs = args.slice(0, prependArgsCount);
				const appendArgs = args.slice(prependArgsCount);

				return fn(...prependArgs, ...this.modifiers[modifierName](...appendArgs));
			};
		};

		return fn;
	}

	log(tagName, ...args) {
		const logObject = {
			tag: this.tags[tagName],
			content: this.buildContentString(args),
			time: new Date(),
			scope: this.scopeValues.slice()
		};

		this.handlers.forEach(handler => handler.write(logObject));
	}

	addHandler(handler) {
		this.handlers.push(handler);
	}

	removeHandler(handler) {
		if (!this.handlers.includes(handler))
			return;

		this.handlers.splice(this.handlers.indexOf(handler), 1);
	}

	createLogger() {
		const timers = new Map();

		return {
			...Object.fromEntries(
				Object.keys(this.tags).map(k => [ k, this.buildModifiedFunction(
					(...args) => this.log(k, ...args)
				) ])
			),

			time: this.buildModifiedFunction((key, ...args) => {
				timers.set(key, Date.now());
				this.log('time', ...args);
			}, 1),

			timeEnd: this.buildModifiedFunction((key, ...args) => {
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
			}, 1),

			scope: (...scopeTags) => {
				const nextScope = this.scopeValues.concat(scopeTags);

				const nextLogger = new this.constructor(nextScope);
				nextLogger.handlers = this.handlers;
				nextLogger.modifiers = this.modifiers;

				return nextLogger.createLogger();
			}
		};
	}
}
