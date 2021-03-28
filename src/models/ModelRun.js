import { DataTypes, Model } from "sequelize";
import packageInfo from "../../package.json";

export default class ModelRun extends Model {}
export function init (sequelize) {
	ModelRun.init({
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			autoIncrement: true,
			primaryKey: true
		},

		start: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
			allowNull: false
		},

		finish: {
			type: DataTypes.DATE
		},

		version: {
			type: DataTypes.TEXT('tiny'),
			defaultValue: packageInfo.version,
			allowNull: false
		}
	}, {
		sequelize,
		modelName: 'Run'
	});
}
