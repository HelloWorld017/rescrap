import Mixin from "./Mixin";

export default class MixinCheckImage extends Mixin {
	create(BaseClass) {
		return class extends BaseClass {
			_postProcess() {
				//TODO
			}
		};
	}
}
