export async function upsertAndReturn(rescrap, ModelClass, value, option = {}) {
	if (ModelClass.getUpsertKeys) {
		// FIXME as sequelize sqlite does not work well with the returning upsert
		const needToCreateTransaction = !option.transaction;
		const transaction = needToCreateTransaction ?
			await rescrap.sequelize.transaction() :
			option.transaction;

		const where = {};
		const upsertOptions = {...option, transaction};

		for (const key of ModelClass.getUpsertKeys()) {
			where[key] = value[key];
		}

		const foundModel = await ModelClass.findOne({
			where
		}, upsertOptions);

		if (!foundModel) {
			const createdModel = ModelClass.create(value, upsertOptions);
			if (needToCreateTransaction)
				await transaction.commit();

			return createdModel;
		}

		await foundModel.update(value, upsertOptions);
		if (needToCreateTransaction)
			await transaction.commit();

		return foundModel;
	}
	
	const [ upsertedValue ] = await ModelClass.upsert(value, { ...option, returning: true });
	return upsertedValue;
}
