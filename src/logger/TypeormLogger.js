export class TypeormLogger {
	constructor(logger) {
		this.logger = logger;
		this.schemaBuildLogger = this.logger.scope('schema');
		this.migrationLogger = this.logger.scope('migration');
	}

	logQuery(query, parameters, queryRunner) {
		const parameterString = this.buildParameterString(parameters);

		this.logger.with('i8n').verbose(
			'database-query',
			{ query, parameters: parameterString }
		);
	}

	logQueryError(error, query, parameters, queryRunner) {
		const parameterString = this.buildParameterString(parameters);

		this.logger.with('i18n').verbose(
			'database-query-error',
			{ query, parameters: parameterString },
			error
		);
	}

	logQuerySlow(time, query, parameters, queryRunner) {
		const parameterString = this.buildParameterString(parameters);

		this.logger.with('i18n').verboseWarn(
			'database-query-slow',
			{ query, parameters: parameterString, time }
		);
	}

	logSchemaBuild(message, queryRunner) {
		this.schemaBuildLogger.verbose(message);
	}

	logMigration(message, queryRunner) {
		this.migrationLogger.verbose(message);
	}

	log(level, message, queryRunner) {
		switch (level) {
			case 'log':
				this.logger.verbose(message);
				break;

			case 'info':
				this.logger.info(message);
				break;

			case 'warn':
				this.logger.warn(message);
				break;
		}
	}

	buildParameterString(parameters) {
		if (!parameters || !parameters.length)
			return '';

		try {
			return JSON.stringify(parameters);
		} catch (err) {
			return parameters;
		}
	}
}
