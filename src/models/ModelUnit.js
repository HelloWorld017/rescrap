import { getMetadataArgsStorage, EntitySchema } from "typeorm";

export default class ModelUnit {
	constructor({ id, key, name, dest, info, parent } = {}) {
		this.id = id;
		this.key = key;
		this.name = name;
		this.dest = dest;
		this.info = info;
		this.parent = parent;
	}
}

export const ModelUnit = new EntitySchema({
	name: "Unit",
	target: ModelUnit,
	columns: {
		id: {
			type: "int",
			generated: "increment",
			primary: true
		},

		key: {
			type: "varchar",
			length: 1023,
			nullable: false
		},

		name: {
			type: "text",
			nullable: false
		},

		dest: {
			type: "varchar",
			length: 1023,
			default: ''
		},

		info: {
			type: "simple-json"
		}
	},

	relations: {
		parent: {
			target: "Unit",
			type: "many-to-one",
			treeParent: true
		},

		children: {
			target: "Unit",
			type: "one-to-many",
			treeChildren: true
		}
	},

	indices: [
		{
			name: "TREE_UNIQUE",
			unique: true,
			columns: [
				"parent",
				"key"
			]
		}
	]
});

// As the depth of the tree is not that high,
// performance degradation cause by using the adjacency list is not that high, too.
getMetadataArgsStorage().trees.push({
	target: 'Unit',
	type: 'adjacency-list'
});
