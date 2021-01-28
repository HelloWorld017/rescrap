import { Command } from "commander";
import rescrapPkg from "../../package.json";
import * as commands from "./commands";

export default class CommandManager {
	constructor(rescrap) {
		this.rescrap = rescrap;
		this.program = new Command();
		this.commands = new Map();

		this.program
			.name("rescrap")
			.version(rescrapPkg.version, '--version', this.rescrap.i18n.t('command-args-version'));
	}

	async initApplication() {
		Object.values(commands)
			.forEach(command => this.registerCommand(command));
	}

	registerCommand(CommandClass) {
		const command = new CommandClass(this.rescrap);

		const program = this.program
			.command(command.name);

		command
			.getCommand(program)
			.action((...args) => {
				command.execute(...args);
			});

		this.commands.set(command.name, command);
	}

	runProgram(args) {
		this.program.parse(args);
	}
}
