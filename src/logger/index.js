import { Logger, LogLevel } from "./Logger";

export * from "./Handler";
export * from "./Logger";

export default class RescrapLogger extends Logger {
	getStaticTags() {
		return Object.assign(
			super.getStaticTags(),
			{
				progress: {
				  level: LogLevel.INFO,
				  label: 'PROGRESS',
				  styles: [ 'magenta' ],
				  badge: '…'
				},

				download: {
				  level: LogLevel.INFO,
				  label: 'DOWNLOAD',
				  styles: [ 'magenta' ],
				  badge: '↓'
				},

				finish: {
				  level: LogLevel.INFO,
				  label: 'FINISH',
				  styles: [ 'green' ],
				  badge: '∴'
				},

				verboseWarn: {
				  level: LogLevel.VERBOSE,
				  label: 'WARNING',
				  styles: [ 'yellow', 'underline' ],
				  badge: '!'
				},

				fatal: {
				  level: LogLevel.ERROR,
				  label: 'FATAL',
				  styles: [ 'red', 'underline' ],
				  badge: '☢'
				}
			}
		);
	}
}
