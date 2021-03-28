import ModelFile,		{ init as fileInit }		from "./ModelFile";
import ModelRun,		{ init as runInit }			from "./ModelRun";
import ModelUnit,		{ init as unitInit }		from "./ModelUnit";
import ModelTerminal,	{ init as terminalInit }	from "./ModelTerminal";

export { ModelFile, ModelRun, ModelUnit, ModelTerminal };

export default async function init (sequelize) {
	runInit(sequelize);
	unitInit(sequelize);
	terminalInit(sequelize);
	fileInit(sequelize);
	await sequelize.sync();

	const [ rootUnit ] = await ModelUnit.findOrCreate({
		where: {
			key: 'root',
			parentId: null
		},

		defaults: {
			name: '<root>'
		}
	});

	return rootUnit;
}
