import { DataTypes, Model, QueryTypes } from "sequelize";

export default class ModelUnit extends Model {
	getChildren() {

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
			SELECT ${fieldsStr} FROM unitTree ORDER BY level(DESC)
		`, {
			model: this.constructor,
			mapToModel: true,
			type: QueryTypes.SELECT
		});
	}
}

export function init (sequelize) {
	ModelUnit.init(
		{
			id: {
				type: DataTypes.INTEGER,
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

			parentId: {
				type: DataTypes.INTEGER
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
			modelName: 'Unit',
			sequelize
		}
	);

	ModelUnit.hasOne(ModelUnit, { as: 'Parent', foreignKey: 'parentId' });
}
