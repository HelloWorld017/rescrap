export function hierarchyUpsert(model) {
	// sequelize-hierarchy doesn't support upsert

	const ModelClass = model.constructor;
	await ModelClass.find({

	});
}
