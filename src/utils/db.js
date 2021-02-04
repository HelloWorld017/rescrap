export async function upsertAndReturn(ModelClass, value, option) {
	const [ upsertedValue ] = await ModelClass.upsert(value, option);
	console.log(upsertedValue);
	return upsertedValue;
}
