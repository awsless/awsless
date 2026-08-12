export const getViewerRequestFunctionCode = (props: {
	blockDirectAccess?: boolean
	redirectWww?: boolean
	basicAuth?: { username: string; password: string }
	passwordAuth?: { password: string }
}): string => {
	return CODE([
		props.blockDirectAccess ? BLOCK_DIRECT_ACCESS_TO_CLOUDFRONT : '',
		props.redirectWww ? REDIRECT_WWW : '',
		(props.passwordAuth ?? props.basicAuth)
			? AUTH_WRAPPER(
					[
						//
						props.basicAuth ? BASIC_AUTH_CHECK(props.basicAuth.username, props.basicAuth.password) : '',
						props.passwordAuth ? PASSWORD_AUTH_CHECK(props.passwordAuth.password) : '',
					].join('\n')
				)
			: '',
	])
}

const BLOCK_DIRECT_ACCESS_TO_CLOUDFRONT = `
if (headers.host && headers.host.value.includes('cloudfront.net')) {
	return {
		statusCode: 403,
		statusDescription: 'Forbidden'
	};
}`

const REDIRECT_WWW = `
if (headers.host && headers.host.value.startsWith('www.')) {
	let location = 'https://' + headers.host.value.slice(4) + request.uri;
	const query = [];

	for(const key in request.querystring) {
		const item = request.querystring[key];

		if(item.multiValue) {
			for(const i in item.multiValue) {
				query.push(key + '=' + item.multiValue[i].value);
			}
		} else if(item.value === '') {
			query.push(key);
		} else {
			query.push(key + '=' + item.value);
		}
	}

	if(query.length > 0) {
		location += '?' + query.join('&');
	}

	return {
		statusCode: 301,
		statusDescription: 'Moved Permanently',
		headers: {
			'location': { value: location },
			'strict-transport-security': { value: 'max-age=31536000; includeSubdomains; preload' }
		}
	};
}`

const BASIC_AUTH_CHECK = (username: string, password: string) => `
authMethods.push('Basic realm="Protected"');

if(!isAuthorized) {
	if(authHeader && authHeader.startsWith('Basic ') && authHeader.slice(6) === '${Buffer.from(`${username}:${password}`).toString('base64')}') {
		isAuthorized = true;
	}
}
`

const PASSWORD_AUTH_CHECK = (password: string) => `
authMethods.push('Password realm="Protected"');

if(!isAuthorized) {
	if(authHeader && authHeader.startsWith('Password ') && authHeader.slice(9) === '${password}') {
		isAuthorized = true;
	}
}
`

const AUTH_WRAPPER = (code: string) => `
const authHeader = headers.authorization && headers.authorization.value;
const authMethods = [];
let isAuthorized = false;

${code}

if (!isAuthorized) {
	return {
		statusCode: 401,
		headers: {
			'access-control-allow-origin': {
				value: '*'
			},
			'www-authenticate': {
				value: authMethods.join(', ')
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

function matchRoute(value, path, method) {
	const list = Array.isArray(value) ? value : [value];

	for(const i in list) {
		const route = list[i];

		if(!isValidRoute(route, method)) {
			continue;
		}

		if(route.match) {
			const found = path.match(new RegExp(route.match));

			if(!found) {
				continue;
			}

			const params = {};

			if(route.params) {
				for(const p in route.params) {
					params[route.params[p]] = found[Number(p) + 1];
				}
			}

			return { route, params };
		}

		return { route };
	}
}

async function findRoute(path, method) {
	const store = cf.kvs();
	const keys = getPossibleRouteKeys(path);

	for(const i in keys) {
		const key = keys[i];
		let value;

		try {
			value = await store.get(key, { format: 'json' });
		} catch (e) {
			continue;
		}

		// Route lists that are too big for a single key value pair
		// are sharded over multiple entries behind a route index.
		if(value && value.list) {
			for(let n = 0; n < value.list; n++) {
				try {
					const route = await store.get(key + '#' + n, { format: 'json' });
					const result = matchRoute(route, path, method);

					if(result) {
						return result;
					}
				} catch (e) {}
			}

			continue;
		}

		const result = matchRoute(value, path, method);

		if(result) {
			return result;
		}
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

function setUrlOrigin(route) {
	cf.updateRequestOrigin(getRequestOriginConfig(route));
}

async function handler(event) {
	const request = event.request;
	const headers = request.headers;
	const path = decodeURIComponent(request.uri);

	if (request.method === 'OPTIONS') {
		return {
			statusCode: 204,
			headers: {
				'access-control-allow-origin': { value: '*' },
				'access-control-allow-methods': { value: 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS' },
				'access-control-allow-headers': { value: '*' },
				'access-control-max-age': { value: '86400' }
			}
		};
	}

	${injection.join('\n')}

	const result = await findRoute(path, request.method);

	if(result) {
		const route = result.route;

		setRouteOrigin(route);

		if(result.params) {
			for(const name in result.params) {
				headers['x-param-' + name.toLowerCase()] = { value: encodeURIComponent(result.params[name]) };
			}
		}

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
