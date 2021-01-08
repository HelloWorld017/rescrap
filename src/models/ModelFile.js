import { sequelize } from "../utils";
import ModelTerminal from "./ModelTerminal";

class ModelFile extends Model {}
ModelFile.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},

	dest: {
		type: DataTypes.STRING,
		allowNull: false
	},

	order: {
		type: DataTypes.INTEGER
	},

	info: {
		type: DataTypes.JSON
	}
}, { sequelize, modelName: 'File' });
ModelTerminal.hasMany(ModelFile);
ModelFile.belongsTo(ModelTerminal);

export default ModelFile;
