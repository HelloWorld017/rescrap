import { Command } from "commander";
import rescrap from "../../package.json";

export default class CommandManager {
	constructor(rescrap) {
		this.rescrap = rescrap;
		this.program = new Command();
		this.commands = new Map();

		this.program
			.version(rescrap.version);
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
