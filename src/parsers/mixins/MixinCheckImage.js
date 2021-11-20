import imageType from "image-type";
import readChunk from "read-chunk";
import Mixin from "./Mixin";

export default class MixinCheckImage extends Mixin {
	create(BaseClass) {
		return class extends BaseClass {
			async _postProcess(unit, file, { fetcher, logger }) {
				const dest = path.join(fetcher.downloadPath, file.dest);
				const chunk = await readChunk(dest, 0, imageType.minimumBytes);
				const type = imageType(chunk);

				if(type === null) {
					logger.verboseWarn.with('i18n')('mixin-check-image-failed');
					throw new Error("Wrong image type");
				}

				const ext = `.${type.ext}`;
				await fs.promises.rename(
					dest,
					dest + ext
				);
				file.dest += ext;
			}
		};
	}
}
