import { sanitizeFilename } from "../utils";

import { DataTypes, Model, QueryTypes } from "sequelize";

export default class ModelUnit extends Model {
	async getChildren() {
		return this.constructor.findAll({ where: { parentId: this.id } });
	}

	async getAncestors({
		fields = [ 'id', 'key', 'name', 'parentId', 'dest' ]
	} = {}) {
		const id = this.id;
		const tableName = this.constructor.getTableName();
		const fieldsStr = fields.join(', ');
		const parentFieldsStr = fields.map(v => `Parent.${v}`).join(', ');

		return this.sequelize.query(`
			WITH RECURSIVE unitTree AS (
				SELECT ${fieldsStr}, 1 level FROM ${tableName} WHERE id = ${id}
				UNION ALL
				SELECT ${parentFieldsStr}, level + 1 FROM ${tableName} AS Parent
				JOIN unitTree ON Parent.id = unitTree.parentId
			)
			SELECT ${fieldsStr} FROM unitTree ORDER BY level DESC
		`, {
			model: this.constructor,
			mapToModel: true,
			type: QueryTypes.SELECT
		});
	}

	static getUpsertKeys() {
		return [ 'key', 'parentId' ];
	}
}

export function init (sequelize) {
	ModelUnit.init(
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true
			},

			key: {
				type: DataTypes.STRING,
				allowNull: false
			},

			name: {
				type: DataTypes.STRING,
				allowNull: false
			},

			dest: {
				type: DataTypes.STRING,
				defaultValue: ''
			},

			info: {
				type: DataTypes.JSON
			}
		},
		{
			indexes: [
				{
					unique: true,
					fields: [ 'key', 'parentId' ]
				}
			],
			hooks: {
				beforeValidate(unit, options) {
					unit.dest = sanitizeFilename(unit.dest);
				}
			},
			modelName: 'Unit',
			sequelize
		}
	);

	ModelUnit.belongsTo(ModelUnit, { as: 'Parent', foreignKey: 'parentId' });
}
