class I18n {
	constructor() {
		this.localeCode = 'en_US';
		this.locales = {};
	}

	registerLocale(localeCode, locale) {
		this.locales[localeCode] = locale;
	}

	setLocale(localeCode) {
		this.localeCode = localeCode;
	}

	addTranslations(translation) {
		
	}

	t(key, args) {

	}
}

export I18n;
