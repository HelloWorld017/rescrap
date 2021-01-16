import pluginCommonjs from "@rollup/plugin-commonjs";
import pluginJson from "@rollup/plugin-json";
import pluginYaml from "@rollup/plugin-yaml";

const env = process.env.NODE_ENV || 'development';

export default {
	input: 'src/Rescrap.js',
	output: {
		file: 'dist/rescrap.bundle.js',
		format: 'cjs',
		exports: 'auto',
		sourcemap: true
	},
	plugins: [
		pluginCommonjs(),
		pluginJson(),
		pluginYaml()
	],
	preferBuiltins: true,
	onwarn(warn) {
		const { code, message } = warn;

		if (code === 'UNRESOLVED_IMPORT' && /treating it as an external dependency/i.test(message))
			return;

		console.error(warn.toString())
	}
};
