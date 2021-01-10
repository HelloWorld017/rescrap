import path from 'path';
import { promisify } from 'util';

export function getRecrondDir() {
	if (process.env.RECROND_DIRECTORY)
		return path.resolve(process.env.RECROND_DIRECTORY);

	return path.resolve('./recrond');
}
