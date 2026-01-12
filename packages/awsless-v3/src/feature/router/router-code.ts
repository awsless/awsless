export const getViewerRequestFunctionCode = (props: {
	blockDirectAccess?: boolean
	basicAuth?: { username: string; password: string }
}): string => {
	return CODE([
		props.blockDirectAccess ? BLOCK_DIRECT_ACCESS_TO_CLOUDFRONT : '',
		props.basicAuth ? BASIC_AUTH_CHECK(props.basicAuth.username, props.basicAuth.password) : '',
	])
}

const BLOCK_DIRECT_ACCESS_TO_CLOUDFRONT = `
if (headers.host.value.includes('cloudfront.net')) {
	return {
		statusCode: 403,
		statusDescription: 'Forbidden'
	};
}`

const BASIC_AUTH_CHECK = (username: string, password: string) => `
const auth = headers.authorization && headers.authorization.value;
if (!auth || !auth.startsWith('Basic ') || auth.slice(6) !== '${Buffer.from(`${username}:${password}`).toString('base64')}') {
	return {
		statusCode: 401,
		headers: {
			'www-authenticate': {
				value: 'Basic realm="Protected"'
			}
		}
	};
}`

const CODE = (injection: string[]) => `
import cf from "cloudfront";

function getPossibleRouteKeys(path) {
	if (path === '' || path === '/') {
		return ['/', '/*'];
	}

	const parts = path.split('/');
	const root = path.startsWith('/') ? parts[1] : parts[0];

	if(root.includes('.')) {
		return [path, '/*'];
	}

	return [path, '/'+root+'/*', '/*'];
}

function isValidRoute(route, method) {
	if(!route) {
		return false;
	}

	if(route.type === 's3') {
		return method === 'GET' || method === 'HEAD';
	}

	return true;
}

async function findRoute(path, method) {
	const store = cf.kvs();
	const keys = getPossibleRouteKeys(path);

	for(const i in keys) {
		const key = keys[i];

		try {
			const route = await store.get(key, { format: 'json' });

			if(isValidRoute(route, method)) {
				return route;
			}
		} catch (e) {}
	}
}

function setRouteOrigin(route) {
	if(route.type === 's3') {
		setS3Origin(route);
	} else if(route.type === 'lambda') {
		setLambdaOrigin(route);
	} else if(route.type === 'url') {
		setUrlOrigin(route);
	} else {
		throw new Error('Unsupported route type');
	}
}

function getRequestOriginConfig(route) {
	const timeouts = {};
	const config = { domainName: route.domainName, timeouts }

	if(typeof route.readTimeout === 'number') {
		timeouts.readTimeout = route.readTimeout;
	}

	if(typeof route.keepAliveTimeout === 'number') {
		timeouts.keepAliveTimeout = route.keepAliveTimeout;
	}

	if(typeof route.responseCompletionTimeout === 'number') {
		timeouts.responseCompletionTimeout = route.responseCompletionTimeout;
	}

	if(typeof route.connectionTimeout === 'number') {
		timeouts.connectionTimeout = route.connectionTimeout;
	}

	if(typeof route.connectionAttempts === 'number') {
		config.connectionAttempts = route.connectionAttempts;
	}

	if(typeof route.customHeaders === 'object') {
		config.customHeaders = route.customHeaders;
	}

	if(typeof route.hostHeader === 'string') {
		config.hostHeader = route.hostHeader;
	}

	if(typeof route.originPath === 'string') {
		config.originPath = route.originPath;
	}

	return config
}

function setS3Origin(route) {
	cf.updateRequestOrigin(Object.assign(getRequestOriginConfig(route), {
		originAccessControlConfig: {
			enabled: true,
			signingBehavior: 'always',
			signingProtocol: 'sigv4',
			originType: 's3',
		}
	}));
}

function setLambdaOrigin(route) {
	cf.updateRequestOrigin(Object.assign(getRequestOriginConfig(route), {
		customOriginConfig: {
			port: 443,
			protocol: 'https',
			sslProtocols: ['TLSv1.2'],
		},
		originAccessControlConfig: {
			enabled: true,
			signingBehavior: 'always',
			signingProtocol: 'sigv4',
			originType: 'lambda',
		}
	}));
}

function setUrlRoute(route) {
	cf.updateRequestOrigin(getRequestOriginConfig(route));
}

async function handler(event) {
	const request = event.request;
	const headers = request.headers;
	const path = decodeURIComponent(request.uri);

	${injection.join('\n')}

	const route = await findRoute(path, request.method);

	if(route) {
		setRouteOrigin(route);

		if(route.forwardHost && headers.host && headers.host.value) {
			headers['x-forwarded-host'] = { value: headers.host.value };
		}

		headers['x-origin'] = { value: route.domainName };

		if(route.urlEncodedQueryString) {
			for (var key in request.querystring) {
				if (key.includes('/')) {
					request.querystring[encodeURIComponent(key)] = request.querystring[key];
					delete request.querystring[key];
				}
			}
		}

		if(route.type === 's3' || route.removeCookies) {
			delete headers["Cookies"];
			delete headers["cookies"];
			delete request.cookies;
		}

		if (route.rewrite) {
			if(route.rewrite.regex) {
				request.uri = request.uri.replace(new RegExp(route.rewrite.regex), route.rewrite.to);
			} else {
				request.uri = route.rewrite.to;
			}
		}
	}

	return request;
}
`
