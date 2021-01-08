import { sequelize } from "../utils";

class ModelUnit extends Model {}
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
			type: DataTypes.STRING
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
				fields: [ 'key', 'hierarchy_level' ],
				where: { hierarchy_level: 1 }
			},

			{
				unique: true,
				fields: [ 'key', 'parent_id' ],
				where: { hierarchy_level: { $gt: 1 } }
			}
		],
		modelName: 'Unit',
		sequelize
	}
);

export default ModelUnit;
