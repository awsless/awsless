import { minutes, seconds, toSeconds } from '@awsless/duration'

// updateRequestOrigin accepts 1-120s, while functions may run for 15 minutes.
const ORIGIN_READ_TIMEOUT = toSeconds(minutes(2))
const ORIGIN_CONNECTION_TIMEOUT = toSeconds(seconds(10))

export const getViewerRequestFunctionCode = (props: {
	router: string
	blockDirectAccess?: boolean
	redirectWww?: boolean
	preview?: boolean
	basicAuth?: { username: string; password: string }
	passwordAuth?: { password: string }
}): string => {
	return CODE(
		[
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
		],
		props.preview ? PREVIEW_PREFIX(props.router) : ACTIVE_PREFIX(props.router)
	)
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
	if(authHeader && authHeader.startsWith('Password ') && authHeader.slice(9) === ${JSON.stringify(password)}) {
		isAuthorized = true;
	}
}
`

// The preview host serves the live deployment by default, or any staged
// deployment selected with the awsless-deployment query parameter. The
// selection is pinned in a cookie, so asset requests hit the same preview.
const PREVIEW_PREFIX = (router: string) => `
const router = ${JSON.stringify(router)};
let deployment;

if (request.querystring['awsless-deployment'] && request.querystring['awsless-deployment'].value) {
	deployment = request.querystring['awsless-deployment'].value;
} else if (request.cookies && request.cookies['awsless-deployment'] && request.cookies['awsless-deployment'].value) {
	deployment = request.cookies['awsless-deployment'].value;
}

let prefix;

try {
	const pointer = deployment ? '$deploy:' + deployment : '$active';
	prefix = (await cf.kvs().get(pointer)).split(':')[0] + ':' + router + ':';
} catch (e) {
	return deployment
		? { statusCode: 404, statusDescription: 'Unknown Deployment' }
		: { statusCode: 503, statusDescription: 'Service Unavailable' };
}

if (deployment && request.querystring['awsless-deployment']) {
	delete request.querystring['awsless-deployment'];

	const query = [];

	for (const key in request.querystring) {
		const entry = request.querystring[key];

		if (entry.multiValue) {
			// The CloudFront js runtime doesn't support for...of.
			for (const i in entry.multiValue) {
				query.push(key + '=' + entry.multiValue[i].value);
			}
		} else {
			query.push(key + '=' + entry.value);
		}
	}

	return {
		statusCode: 302,
		statusDescription: 'Found',
		headers: {
			location: { value: request.uri + (query.length ? '?' + query.join('&') : '') }
		},
		cookies: {
			'awsless-deployment': {
				value: deployment,
				attributes: 'Path=/; Secure; SameSite=Lax'
			}
		}
	};
}`

// '$active' points at the route table of the live deployment.
const ACTIVE_PREFIX = (router: string) => `
const router = ${JSON.stringify(router)};
let prefix;

try {
	prefix = (await cf.kvs().get('$active')).split(':')[0] + ':' + router + ':';
} catch (e) {
	return {
		statusCode: 503,
		statusDescription: 'Service Unavailable'
	};
}`

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

const CODE = (injection: string[], prefixCode: string) => `
import cf from "cloudfront";

function getPossibleRouteKeys(path) {
	if (path === '' || path === '/') {
		return ['/', '/*'];
	}

	const parts = path.split('/');
	const root = path.startsWith('/') ? parts[1] : parts[0];
	const file = parts[parts.length - 1].includes('.');

	if(root.includes('.')) {
		return [path, '/*.', '/*'];
	}

	if(file) {
		return [path, '/'+root+'/*.', '/'+root+'/*', '/*.', '/*'];
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

async function findRoute(path, method, prefix) {
	// only route selection is normalized, the forwarded uri stays untouched
	if (path.length > 1 && path.slice(-1) === '/') {
		path = path.slice(0, -1);
	}

	const store = cf.kvs();
	const keys = getPossibleRouteKeys(path);

	for(const i in keys) {
		const key = keys[i];

		try {
			const route = await store.get(prefix + key, { format: 'json' });

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
	const config = getRequestOriginConfig(route);

	if(typeof config.timeouts.readTimeout !== 'number') {
		config.timeouts.readTimeout = ${ORIGIN_READ_TIMEOUT};
	}

	if(typeof config.timeouts.connectionTimeout !== 'number') {
		config.timeouts.connectionTimeout = ${ORIGIN_CONNECTION_TIMEOUT};
	}

	cf.updateRequestOrigin(Object.assign(config, {
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
	let path;

	try {
		path = decodeURIComponent(request.uri);
	} catch (e) {
		path = request.uri;
	}

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

	${prefixCode}

	const route = await findRoute(path, request.method, prefix);

	if(!route) {
		return {
			statusCode: 404,
			statusDescription: 'Not Found'
		};
	}

	if(route.requestHeaders) {
		for(const name in route.requestHeaders) {
			headers[name] = { value: route.requestHeaders[name] };
		}
	}

	if(route.type === 'lambda') {
		if(headers.authorization) {
			headers['x-awsless-authorization'] = headers.authorization;
		} else {
			delete headers['x-awsless-authorization'];
		}
	}

	setRouteOrigin(route);

	if(route.forwardHost && headers.host && headers.host.value) {
		headers['x-forwarded-host'] = { value: headers.host.value };
	} else {
		delete headers['x-forwarded-host'];
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

	return request;
}
`
