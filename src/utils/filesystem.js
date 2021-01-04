import config from '../config';
import path from 'path';

export function getRecrondDir() {
	if (process.env.RECROND_DIRECTORY)
		return path.resolve(process.env.RECROND_DIRECTORY);

	return path.resolve('./recrond');
}
