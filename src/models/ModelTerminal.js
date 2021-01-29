import { EntitySchema } from "typeorm";

export default class ModelTerminal {
	constructor({ id, downloaded } = {}) {
		this.id = id;
		this.downloaded = downloaded;
	}
}

export const EntityTerminal = new EntitySchema({
	name: "Terminal",
	target: ModelTerminal,
	columns: {
		id: {
			type: "int",
			generated: "increment",
			primary: true
		},

		downloaded: {
			type: "boolean"
		}
	}
});
