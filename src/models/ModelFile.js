import { EntitySchema } from "typeorm";

export default class ModelFile {
	constructor({ id, dest, order, info, terminal } = {}) {
		this.id = id;
		this.dest = dest;
		this.order = order;
		this.info = info;
		this.terminal = terminal;
	}
}

export const EntityFile = new EntitySchema({
	name: "File",
	target: ModelFile,
	columns: {
		id: {
			type: "int",
			generated: "increment",
			primary: true
		},

		dest: {
			type: "varchar",
			length: 1023,
			unique: true,
			nullable: false
		},

		order: {
			type: "int",
			nullable: false
		},

		info: {
			type: "simple-json"
		}
	},

	relations: {
		terminal: {
			target: "Terminal",
			type: "many-to-one"
		}
	}
});
