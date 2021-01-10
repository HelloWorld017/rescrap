class ModelTerminal extends Model {}
export default ModelTerminal;
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
