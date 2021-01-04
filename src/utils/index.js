export * from "./db";
export * from "./filesystem";
export * from "./promise";

export default function named(BaseClass = Object) {
	return class Named extends BaseClass {
		constructor(...args) {
			super(...args);
			this.name = this.constructor.getName();
		}

		static getName() {
			return '';
		}
	};
}
