import TypeormLogger from "../logger";
import typeorm from "typeorm";

import ModelFile,		{ EntityFile }		from "./ModelFile";
import ModelUnit,		{ EntityUnit }		from "./ModelUnit";
import ModelTerminal,	{ EntityTerminal }	from "./ModelTerminal";

export { ModelFile, ModelUnit, ModelTerminal };

export default async function init (connectionOpts, logger) {
	const typeormLogger = new TypeormLogger(logger);

	return typeorm.createConnection({
		...connectionOpts,
		synchronize: true,
		logger: typeormLogger,
		entitySchemas: [
			EntityFile,
			EntityUnit,
			EntityTerminal
		]
	});
}
