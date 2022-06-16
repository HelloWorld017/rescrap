import { named } from "../../utils";

import Mixin from "../mixins/Mixin";

export default class Trait extends named(Mixin) {
	create(BaseClass) {
		const name = this.name;
		const methods = this.methods;

		const TraitClass = class extends BaseClass {
			constructor(...args) {
				super(...args);
				this.implemented.add(name);
			}
		};

		methods.forEach(method => {
			const implMethod = `_${method}`;

			TraitClass.prototype[ method ] = function (...args) {
				return this.rescrap.pluginManager
					.execute(this, `parser/${method}`, args, this[implMethod].bind(this));
			};

			TraitClass.prototype[ implMethod ] = function() {};
		});

		return TraitClass;
	}

	get methods() {
		return [];
	}
}
