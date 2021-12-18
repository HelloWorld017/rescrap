import { Op } from "sequelize";

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
			const createdModel = await ModelClass.create(value, upsertOptions);
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

export async function bulkUpsertAndReturn(rescrap, ModelClass, values, option = {}) {
	if (ModelClass.getUpsertKeys) {
		const needToCreateTransaction = !option.transaction;
		const transaction = needToCreateTransaction ?
			await rescrap.sequelize.transaction() :
			option.transaction;

		const upsertOptions = { ...option, transaction };
		const upsertKeys = ModelClass.getUpsertKeys();
		const updateKeys = new Set();

		const wheres = [];
		values.forEach(value => {
			const where = {};
			for (const key of upsertKeys) {
				where[key] = value[key];
			}
			wheres.push(where);

			for (const key of Object.keys(value)) {
				updateKeys.add(key);
			}
		});
		upsertKeys.forEach(upsertKey => {
			updateKeys.delete(upsertKey);
		});

		const created = await ModelClass.bulkCreate(values, {
			...upsertOptions,
			updateOnDuplicate: [ ...updateKeys ]
		});

		const output = await ModelClass.findAll({
			...upsertOptions,
			where: {
				[ Op.or ]: wheres
			}
		});

		if (needToCreateTransaction)
			await transaction.commit();

		const outputMap = new Map();

		const getUpsertKeyTuple = model => JSON.stringify(
			upsertKeys.map(key => String(model[key]))
		);

		output.forEach(model => {
			const upsertKey = getUpsertKeyTuple(model);
			outputMap.set(upsertKey, model);
		});

		return created.map(model => {
			const upsertKey = getUpsertKeyTuple(model);
			return outputMap.get(upsertKey);
		});
	}

	return Promise.all(values.map(value => upsertAndReturn(rescrap, ModelClass, value, option)));
}
