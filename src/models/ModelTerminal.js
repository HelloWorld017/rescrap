import { DataTypes, Model } from "sequelize";
import ModelUnit from "./ModelUnit";

export default class ModelTerminal extends Model {}
export function init (sequelize) {
	ModelTerminal.init({
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true
		},

		downloaded: {
			type: DataTypes.BOOLEAN
		}
	}, { sequelize, modelName: 'Terminal' });

	ModelUnit.hasOne(ModelTerminal);
	ModelTerminal.belongsTo(ModelUnit);
}
