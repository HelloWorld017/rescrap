import ModelFile,		{ init as fileInit }		from "./ModelFile";
import ModelUnit,		{ init as unitInit }		from "./ModelUnit";
import ModelTerminal,	{ init as terminalInit }	from "./ModelTerminal";

export { ModelFile, ModelUnit, ModelTerminal };

export default async function init (sequelize) {
	unitInit(sequelize);
	terminalInit(sequelize);
	fileInit(sequelize);
	await sequelize.sync();
}
