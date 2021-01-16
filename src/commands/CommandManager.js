import { Command } from "commander";
import package from "../../package.json";

export default class CommandManager {
	constructor(rescrap) {
		this.rescrap = rescrap;
		this.program = program;
		this.commands = new Map();

		this.program
			.version(package.version);
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
