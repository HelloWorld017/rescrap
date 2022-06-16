import mergeConfig from "axios/lib/core/mergeConfig";
import { createCookieAgent } from 'http-cookie-agent/http';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http'
import { SocksProxyAgent } from 'socks-proxy-agent';

export function copyAxiosInterceptors(fromAxios, toAxios) {
	Object.keys(fromAxios.interceptors)
		.forEach(interceptorKey => {
			const interceptorManager = fromAxios.interceptors[interceptorKey];
			const newInterceptorManager = toAxios.interceptors[interceptorKey];

			interceptorManager.handlers.forEach(({ fulfilled, rejected, ...options }) => {
				newInterceptorManager.use(fulfilled, rejected, options);
			});
		});

	return toAxios;
}

export function mergeAxios(...reqs) {
	return reqs.reduce(
		(base, config) => mergeConfig(base, config),
		{}
	);
}

export function axiosCookieProxy(axios) {
	const CookieProxyAgent = createCookieAgent(SocksProxyAgent);

	const cookieProxyInterceptor = config => {
		if (!config.jar && !config.socksProxy)
			return config;

		const agent = { httpAgent: null, httpsAgent: null };

		if (!config.jar) {
			const proxyAgent = new SocksProxyAgent(config.socksProxy);
			agent.httpAgent = proxyAgent;
			agent.httpsAgent = proxyAgent;
		} else if (!config.proxy) {
			agent.httpAgent = new HttpCookieAgent({ jar: config.jar });
			agent.httpsAgent = new HttpsCookieAgent({ jar: config.jar });
		} else {
			const cookieProxyAgent = new CookieProxyAgent({ jar: config.jar, ...config.socksProxy });
			agent.httpAgent = cookieProxyAgent;
			agent.httpsAgent = cookieProxyAgent;
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
