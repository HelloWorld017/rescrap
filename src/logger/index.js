import { Logger, LogLevel } from "./Logger";

export class RescrapLogger extends Logger {
	getStaticTags() {
		return Object.assign(
			super.getStaticTags(),
			{
				progress: {
				  level: LogLevel.INFO,
				  label: 'PROGRESS',
				  styles: [ 'bgMagenta' ],
				  badge: '…'
				},

				download: {
				  level: LogLevel.INFO,
				  label: 'DOWNLOAD',
				  styles: [ 'bgMagenta' ],
				  badge: '↓'
				},

				finish: {
				  level: LogLevel.INFO,
				  label: 'FINISH',
				  styles: [ 'bgGreen', 'black' ],
				  badge: '∴'
				},

				verboseWarn: {
				  level: LogLevel.VERBOSE,
				  label: 'WARNING',
				  styles: [ 'bgYellow', 'black' ],
				  badge: '!'
				},

				fatal: {
				  level: LogLevel.ERROR,
				  label: 'FATAL',
				  styles: [ 'bgRed' ],
				  badge: '☢'
				}
			}
		);
	}
}

export default RescrapLogger;
