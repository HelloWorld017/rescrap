import chalk from "chalk";
import { format as formatDate } from "date-fns";
import fs from "fs";
import stripAnsi from "strip-ansi";
import path from "path";

import { LogLevel } from "./Logger";

export class HandlerBase {
    constructor(logLevel) {
        this.logLevel = logLevel;
    }

    write(log) {
        if (log.tag.level < this.logLevel)
            return;

        this._write(log);
    }

    _write(log) {
        throw new Error("Unimplemented function!");
    }
}

export class HandlerFile extends HandlerBase {
    constructor(logLevel, file) {
        super(logLevel);

        const date = new Date();
        const dest = file
            .replace(/{date}/g, `${Math.floor(date.getTime() / 1000)}`)
            .replace(/{datestr}/g, formatDate(new Date(), "yyyy-MM-dd HH.mm.ss"));

        const logdir = path.dirname(dest);
        fs.mkdirSync(logdir, { recursive: true });

        this.dest = dest;
        this.file = null;
        this.writeQueue = null;
    }

    buildString(log) {
        const { tag, scope, content, time } = log;
        const timeString = this.buildTimeString(time);
        const scopeString = this.buildScopeString(scope);
        const tagString = this.buildTagString(tag);
        const contentString = this.buildContentString(content);

        return timeString + '  '
            + (scopeString ? scopeString + '  ' : '')
            + tagString + ' ' + contentString + '\n';
    }

    buildTimeString(date = new Date()) {
        return formatDate(date, "yyyy/MM/dd(EE) HH:mm:ss:SS xxx");
    }

    buildScopeString(scope) {
        if (scope.length === 0)
            return '';

        return `[ ${scope.join(' > ')} ]`;
    }

    buildTagString(tag) {
        return `[ ${tag.label} ]`;
    }

    buildContentString(content) {
        return stripAnsi(content);
    }

    _write(log) {
        const { tag } = log;

        if (tag.level < this.logLevel)
            return;

        if (!this.writeQueue) {
            if (this.file === null) {
                this.writeQueue = fs.promises.open(this.dest, 'a')
                    .then(handle => this.file = handle);
            } else {
                this.writeQueue = Promise.resolve();
            }
        }

        const logString = this.buildString(log);

        this.writeQueue = this.writeQueue
            .then(() => this.file.appendFile(logString))
            .catch()
            .then(() => this.writeQueue = null);
    }
}

export class HandlerConsole extends HandlerBase {
    buildString(log) {
        const { tag, scope, content, time } = log;
        const timeString = this.buildTimeString(time);
        const scopeString = this.buildScopeString(scope);
        const tagString = this.buildTagString(tag);
        const contentString = this.buildContentString(content);

        return timeString + '  ' +
            (scopeString ? scopeString + '  ' : '') +
            tagString + ' ' + contentString;
    }

    buildScopeString(scope) {
        if (scope.length === 0)
            return '';

        return chalk.grey(`[ ${scope.join(' ≫ ')} ]`);
    }

    buildTimeString(date = new Date()) {
        return chalk.grey(
            formatDate(new Date(), "HH:mm:ss")
        );
    }

    buildTagString(tag) {
        const colorFunction = tag.styles.reduce((colorFunction, style) => colorFunction[style], chalk);

        const tagString = tag.badge
            ? colorFunction(` ${tag.badge} ${tag.label} `)
            : colorFunction(` ${tag.label} `);

        return tagString;
    }

    buildContentString(content) {
        if (content.includes('\n')) {
            return content + '\n';
        }

        return content;
    }

    _write(log) {
        const { tag } = log;
        if (tag.level < this.logLevel)
            return;

        console.log(this.buildString(log));
    }
}

export class HandlerQueue extends HandlerBase {
    constructor() {
        super(LogLevel.VERBOSE);

        this.queue = [];
    }

    _write(log) {
        this.queue.push(log);
    }

    flush(loggerManager) {
        loggerManager.removeHandler(this);
        loggerManager.handlers.forEach(handler => {
            this.queue.forEach(log => handler.write(log));
        });

        this.queue = [];
    }
}
