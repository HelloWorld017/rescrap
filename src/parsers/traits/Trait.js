import { named } from "../../utils";

import Mixin from "../mixins/Mixin";

export default class Trait extends named(Mixin) {
	create(BaseClass) {
		const name = this.name;
		const methods = this.methods;

		const TraitClass = class extends BaseClass {
			constructor(...args) {
				super(...args);
				this.implemented.push(name);
			}
		};

		methods.forEach(method => {
			const doMethod = `do${method.slice(0, 1).toUpperCase() + method.slice(1)}`;

			TraitClass.prototype[ method ] = function (...args) {
				return this[ doMethod ](...args);
			};

			TraitClass.prototype[ doMethod ] = function() {};
		});

		return TraitClass;
	}

	get methods() {
		return [];
	}
}
