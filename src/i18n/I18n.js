import globby from "globby";
import { merge } from "../utils";
import path from "path";
import YAML from "yaml";

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
		const i18nName = path.basename(i18nFile);
		const i18nValue = YAML.parse(i18nContent);

		this.registerLocale(i18nName, i18nValue);
	}

	t(key, args) {
		//TODO
	}
}
