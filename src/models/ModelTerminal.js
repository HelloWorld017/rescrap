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
});

ModelUnit.hasOne(ModelTerminal);
ModelTerminal.belongsTo(ModelUnit);
