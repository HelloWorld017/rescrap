import chalk from "chalk";
import chalkTemplates from "chalk/templates";
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

	addModifier(modifierName, modifierFn) {
		this.modifiers[modifierName] = modifierFn;
	}

	buildContentString(args) {
		return args.map(v => {
			return (typeof v === 'object' && v !== null)
				? `\n${util.inspect(v, { depth: Infinity, colors: true })}`
				: chalkTemplates(chalk, v);
		}).join(' ');
	}

	buildModifiedFunction(fn, prependArgsCount = 0) {
		fn.with = modifierName => {
			if (typeof this.modifiers[modifierName] !== 'function')
				return fn;

			return (...args) => {
				const prependArgs = args.slice(0, prependArgsCount);
				const appendArgs = args.slice(prependArgsCount);

				return fn(prependArgs, ...this.modifiers[modifierName](...appendArgs));
			};
		};

		return fn;
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
			time: this.buildModifiedFunction((key, ...args) => {
				timers.set(key, Date.now());
				this.log('timeStart', ...args);
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
				this.handlers.forEach(handler => nextLogger.addHandler(handler));

				return nextLogger.createLogger();
			},

			...Object.fromEntries(
				Object.keys(this.tags).map(k => [ k, this.buildModifiedFunction(
					(...args) => this.log(k, ...args)
				) ])
			)
		};
	}
}
