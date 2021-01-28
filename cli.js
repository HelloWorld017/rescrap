const Rescrap = require('./dist/rescrap.bundle.js');
const rescrap = new Rescrap();

Promise.resolve()
	.then(() => rescrap.init({ basePath: process.env.RESCRAP_PATH }, true))
	.then(() => rescrap.commandManager.runProgram(process.argv));
