class FetchResult {
	constructor(response) {
		this.data = response.data;
		this.statusCode = response.statusCode;
		this.retryCount = 0;
	}
}

export default FetchResult;
