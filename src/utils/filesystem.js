import config from '../config';
import glob as globModule from "glob";
import path from 'path';
import { promisify } from 'util';

export function getRecrondDir() {
	if (process.env.RECROND_DIRECTORY)
		return path.resolve(process.env.RECROND_DIRECTORY);

	return path.resolve('./recrond');
}

export function getDownloadDir() {
	return path.resolve(
		getRecrondDir(),
		config.fetch.download.path
	);
}

export async function glob(pattern, base = getRecrondDir()) {
	return promisify(globModule)(pattern, { cwd: base });
}
