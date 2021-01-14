import { named } from "../utils";

export default class Command extends named() {
	constructor(rescrap, description) {
		super();

		this.rescrap = rescrap;
		this.description = description;
	}

	getCommand(program) {

	}

	async execute() {

	}
}
