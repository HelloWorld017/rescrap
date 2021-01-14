import ModelTerminal from "./ModelTerminal";

class ModelFile extends Model {}
export default ModelFile;
export function init () {
	ModelFile.init({
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true
		},

		dest: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true
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
}
