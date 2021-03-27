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

	ModelUnit.hasOne(ModelTerminal, { foreignKey: 'unitId' });
	ModelTerminal.belongsTo(ModelUnit, { foreignKey: 'unitId' });
	// ModelTerminal.belongsTo(ModelRun);
}
