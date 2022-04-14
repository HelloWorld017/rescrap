import mergeConfig from "axios/lib/core/mergeConfig";
import { createCookieAgent } from 'http-cookie-agent';
import HttpProxyAgent from 'http-proxy-agent';
import HttpsProxyAgent from 'https-proxy-agent';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent'

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

export function axiosCookieProxy(axios) {
	const HttpCookieProxyAgent = createCookieAgent(HttpProxyAgent);
	const HttpsCookieProxyAgent = createCookieAgent(HttpsProxyAgent);

	const cookieProxyInterceptor = config => {
		if (!config.jar && !config.proxy)
			return config;

		const agent = { httpAgent: null, httpsAgent: null };
		
		if (!config.jar) {
			agent.httpAgent = new HttpProxyAgent(config.proxy);
			agent.httpsAgent = new HttpsProxyAgent(config.proxy);
		} else if (!config.proxy) {
			agent.httpAgent = new HttpCookieAgent({ jar: config.jar });
			agent.httpsAgent = new HttpsCookieAgent({ jar: config.jar });
		} else {
			agent.httpAgent = new HttpCookieProxyAgent({ jar: config.jar, ...config.proxy });
			agent.httpsAgent = new HttpsCookieProxyAgent({ jar: config.jar, ...config.proxy });
		}

		return {
			...config,
			...agent
		};
	};

	const isWrapped = axios.interceptors.request.handlers
		.find(({ fulfilled }) => fulfilled === cookieProxyInterceptor);

	if (isWrapped)
		return axios;

	axios.interceptors.request.use(cookieProxyInterceptor);
	return axios;
}
