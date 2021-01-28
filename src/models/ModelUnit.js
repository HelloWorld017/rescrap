import { DataTypes, Model, Op } from "sequelize";

export default class ModelUnit extends Model {}
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

			dest: {
				type: DataTypes.STRING,
				defaultValue: ''
			},

			info: {
				type: DataTypes.JSON
			}
		},
		{
			hierarchy: true,
			indexes: [
				{
					unique: true,
					fields: [ 'key', 'hierarchyLevel' ],
					where: { hierarchyLevel: 1 }
				},

				{
					unique: true,
					fields: [ 'key', 'parentId' ],
					where: { hierarchyLevel: { [ Op.gt ] : 1 } }
				}
			],
			modelName: 'Unit',
			sequelize
		}
	);
}
