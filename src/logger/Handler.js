import chalk, { Chalk } from 'chalk';

export class HandlerBase {
    constructor(logLevel) {
        this.logLevel = logLevel;
    }

    write(log) {
        throw new Error("Unimplemented function!");
    }
}

export class HandlerFile extends HandlerBase {
    constructor(logLevel, file) {
        super(logLevel);

        this.file = file;
        this.writeQueue = null;
    }

    buildString(log) {
        const {tag, scope, content, time} = log;
        const timeString = this.buildTimeString(time);
        const scopeString = this.buildScopeString(scope);
        const contentString = this.buildContentString(tag, content);

        return timeString + '  '
            + (scopeString ? scopeString + '  ' : '')
            + contentString;
    }

    buildTimeString(date = new Date()) {
        return date.toString();
    }

    buildScopeString(scope) {
        if (scope.length === 0)
            return '';

        return `[ ${scope.join(' > ')} ]`;
    }

    buildContentString(tag, content) {
        return `[ ${tag.label} ] ${content}`;
    }

    write(log) {
        const {tag} = log;

        if (tag.level < this.logLevel)
            return;

        if (!this.writeQueue)
            this.writeQueue = Promise.resolve();

        const logString = this.buildString(log);

        this.writeQueue = this.writeQueue
            .then(() => fs.promises.appendFile(this.file, logString))
            .catch()
            .then(() => this.writeQueue = null);
    }
}

export class HandlerConsole extends HandlerBase {
    buildString(log) {
        const {tag, scope, content, time} = log;
        const timeString = this.buildTimeString(time);
        const scopeString = this.buildScopeString(scope);
        const contentString = this.buildContentString(tag, content);

        return timeString + '  ' +
            (scopeString ? scopeString + '  ' : '') +
            contentString;
    }

    buildScopeString(scope) {
        if (scope.length === 0)
            return '';

        return chalk.grey(`[ ${scope.join(' ≫ ')} ]`);
    }

    buildTimeString(date = new Date()) {
        return chalk.grey(
            date.getHours().toString().padStart(2, '0') + ':' +
            date.getMinutes().toString().padStart(2, '0') + ':' +
            date.getSeconds().toString().padStart(2, '0')
        );
    }

    buildContentString(tag, content) {
        const colorFunction = tag.styles.reduce((colorFunction, style) => colorFunction[style], chalk);

        const tagString = tag.badge
            ? colorFunction(`  ${tag.badge} ${tag.label}  `)
            : colorFunction(`  ${tag.label}  `);

        return tagString + '  ' + content;
    }

    write(log) {
        const {tag} = log;

        if (tag.level < this.logLevel)
            return;

        console.log(this.buildString(log));
    }
}
