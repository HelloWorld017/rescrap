import sanitizeFilename from "sanitize-filename";

import { DataTypes, Model } from "sequelize";
import ModelTerminal from "./ModelTerminal";

export default class ModelFile extends Model {}
export function init (sequelize) {
	ModelFile.init({
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			autoIncrement: true,
			primaryKey: true
		},

		dest: {
			type: DataTypes.STRING,
			allowNull: false
		},

		order: {
			type: DataTypes.INTEGER.UNSIGNED
		},

		info: {
			type: DataTypes.JSON
		}
	}, {
		sequelize,
		indexes: [
			{
				unique: true,
				fields: [ 'dest', 'terminalId' ]
			}
		],
		hooks: {
			beforeValidate(file, options) {
				file.dest = sanitizeFilename(file.dest);
			}
		},
		modelName: 'File'
	});

	ModelTerminal.hasMany(ModelFile, { foreignKey: 'terminalId' });
	ModelFile.belongsTo(ModelTerminal, { foreignKey: 'terminalId' });
}
