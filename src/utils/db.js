export async function upsertAndReturn(rescrap, ModelClass, value, option = {}) {
	if (ModelClass.getUpsertKeys) {
		// FIXME as sequelize sqlite does not work well with the returning upsert
		const transaction = option.transaction || rescrap.sequelize.transaction();
		const where = {};
		const upsertOptions = {...option, transaction};

		for (const key of ModelClass.getUpsertKeys()) {
			where[key] = value[key];
		}

		const foundModel = await ModelClass.findOne({
			where
		}, upsertOptions);

		if (!foundModel) {
			return ModelClass.create(value, upsertOptions);
		} else {
			await foundModel.update(value, upsertOptions);
			return foundModel;
		}
	}
	const [ upsertedValue ] = await ModelClass.upsert(value, { ...option, returning: true });
	return upsertedValue;
}
