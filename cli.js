const Rescrap = require('./dist/rescrap.bundle.js');
const rescrap = new Rescrap();

Promise.resolve()
	.then(() => rescrap.initApplication())
	.then(() => rescrap.commandManager.runProgram(process.argv));
