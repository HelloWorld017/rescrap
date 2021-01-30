import mergeConfig from "axios/lib/core/mergeConfig";

export function copyAxiosInterceptors(axios) {
	const newInterceptors = {};

	Object.keys(axios.interceptors)
		.forEach(interceptorKey => {
			const interceptorManager = axios.interceptors[interceptorKey];
			const InterceptorManager = interceptorManager.constructor;

			const newInterceptorManager = new InterceptorManager();
			newInterceptorManager.handlers = [...interceptorManager.handlers];

			newInterceptors[interceptorKey] = newInterceptorManager;
		});

	return newInterceptors;
}

export function mergeAxios(...reqs) {
	return reqs.reduce(
		(base, config) => mergeConfig(base, config),
		{}
	);
}
