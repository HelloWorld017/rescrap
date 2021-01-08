import { sequelize } from "../utils";

class ModelTerminal extends Model {}
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
