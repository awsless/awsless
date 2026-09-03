import { t as createProxy } from "./proxy-HAezNYiX.js";
import { constantCase } from "change-case";
import { seconds, toMilliSeconds } from "@awsless/duration";
//#region src/lib/client/http.ts
var HttpError = class extends Error {
	status;
	body;
	url;
	constructor(status, body, url) {
		super(`HTTP ${status} from ${url}: ${body.slice(0, 500)}`);
		this.status = status;
		this.body = body;
		this.url = url;
		this.name = "HttpError";
	}
};
const createHttpFetcher = (host, options = {}) => {
	const timeout = toMilliSeconds(options.timeout ?? seconds(30));
	return async ({ method, path, headers, body, query }) => {
		const url = new URL(path, host);
		if (query) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
		headers.set("content-type", "application/json");
		const payload = body === void 0 ? void 0 : JSON.stringify(body);
		if (method === "POST") {
			const bytes = new TextEncoder().encode(payload ?? "");
			const hash = await crypto.subtle.digest("SHA-256", bytes);
			headers.set("x-amz-content-sha256", Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join(""));
		}
		const response = await fetch(url, {
			method,
			headers,
			...method === "GET" ? {} : { body: payload },
			signal: AbortSignal.timeout(timeout)
		});
		if (!response.ok) throw new HttpError(response.status, await response.text().catch(() => ""), url.toString());
		return await response.json();
	};
};
const createHttpClient = (fetcher) => {
	const fetch = (method, routeKey, props) => {
		const path = routeKey.replaceAll(/{([a-z0-9-]+)}/g, (key) => {
			return encodeURIComponent(props?.params?.[key.substring(1, key.length - 1)]?.toString() ?? "");
		});
		return fetcher({
			headers: new Headers(props?.headers),
			query: props?.query,
			body: props?.body,
			method,
			path
		});
	};
	return {
		fetch,
		get(routeKey, props) {
			return fetch("GET", routeKey, props);
		},
		post(routeKey, props) {
			return fetch("POST", routeKey, props);
		}
	};
};
//#endregion
//#region src/lib/client/util.ts
const getBindEnv = (name) => {
	return import.meta.env?.[name];
};
//#endregion
//#region src/lib/client/auth.ts
const Auth = /*@__PURE__*/ createProxy((name) => {
	return getAuthProps(name);
});
const getAuthProps = (name) => {
	const id = constantCase(name);
	return {
		userPoolId: getBindEnv(`AUTH_${id}_USER_POOL_ID`),
		clientId: getBindEnv(`AUTH_${id}_CLIENT_ID`)
	};
};
//#endregion
export { Auth, HttpError, createHttpClient, createHttpFetcher, getAuthProps };
