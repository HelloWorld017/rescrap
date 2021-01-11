import globby from "globby";
import { merge } from "../utils";
import path from "path";
import yaml from "yaml";

import enUS from "./en_US.yml";

export default class I18n {
	constructor(recrond) {
		this.recrond = recrond;
		this.localeCode = 'en_US';
		this.fallbackLocale = 'en_US';
		this.locales = {
			'en_US': enUS
		};
	}

	async initApplication() {
		this.setLocale(this.recrond.config.locale);
		await loadI18ns();
	}

	registerLocale(localeCode, locale) {
		this.locales[localeCode] =
			merge([
				this.locales[localeCode] || {},
				locale
			]);
	}

	setLocale(localeCode) {
		this.localeCode = localeCode;
	}

	async loadI18ns() {
		const i18ns = await globby([
			"locales/*.yml"
		], {
			cwd: this.recrond.basePath
		});

		for (const i18nFile of i18ns) {
			await this.loadI18n(path.join(this.recrond.basePath, i18nFile));
		}
	}

	async loadI18n(i18nPath) {
		const i18nContent = await fs.promises.readFile(i18nPath, 'utf8');
		const i18nValue = yaml.parse(i18nContent);

		this.registerLocale(i18nValue.locale);
	}

	createI18n() {
		return {
			t: (key, args = {}) => {
				const translation = this.locales[this.locale][key] ??
					this.locales[this.fallbackLocale][key] ??
					key;

				const interpolated = Object.keys(args).reduce((translation, key) => {
					return translation
						.split(`{${key}}`)
						.join(args[key])
				}, translation);

				return interpolated;
			}
		};
	}

	createLoggerModifier() {
		const i18n = this.createI18n();

		return (translationKey, ...args) => {
			if (typeof translationKey === 'string') {
				if (args.length > 0) {
					return [
						i18n.t(translationKey, args[args.length - 1]),
						...args.slice(0, -1)
					];
				}
				return [ i18n.t(translationKey) ];
			}

			return [ translationKey, ...args ];
		};
	}
}
