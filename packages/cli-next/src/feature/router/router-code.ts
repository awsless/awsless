export const getViewerRequestFunctionCode = (props: {
	router: string
	blockDirectAccess?: boolean
	basicAuth?: { username: string; password: string }
	passwordAuth?: { password: string }
}): string => {
	return CODE(
		[
			props.blockDirectAccess ? BLOCK_DIRECT_ACCESS_TO_CLOUDFRONT : '',
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
		ACTIVE_PREFIX(props.router)
	)
}

// The preview function serves every router, so the auth checks
// switch on the router resolved from the request host.
export const getPreviewRequestFunctionCode = (props: {
	defaultRouter: string
	deployUrls?: boolean
	routers: {
		id: string
		basicAuth?: { username: string; password: string }
		passwordAuth?: { password: string }
	}[]
}): string => {
	return CODE(
		[],
		props.deployUrls ? DEPLOY_URLS_PREFIX(props.defaultRouter) : ACTIVE_PREFIX(props.defaultRouter),
		props.routers.map(router =>
			(router.passwordAuth ?? router.basicAuth)
				? `if (router === ${JSON.stringify(router.id)}) {` +
					AUTH_WRAPPER(
						[
							//
							router.basicAuth ? BASIC_AUTH_CHECK(router.basicAuth.username, router.basicAuth.password) : '',
							router.passwordAuth ? PASSWORD_AUTH_CHECK(router.passwordAuth.password) : '',
						].join('\n')
					) +
					'\n}'
				: ''
		)
	)
}

const BLOCK_DIRECT_ACCESS_TO_CLOUDFRONT = `
if (headers.host && headers.host.value.includes('cloudfront.net')) {
	return {
		statusCode: 403,
		statusDescription: 'Forbidden'
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

// deployment url hosts like main-42.example.com resolve their router and
// deployment number to a route table via '$deploy:42'; the distribution's
// own cloudfront.net host serves the default router's active deployment
const DEPLOY_URLS_PREFIX = (defaultRouter: string) => `
let router;
let prefix;
const host = (headers.host ? headers.host.value : '').split(':')[0].toLowerCase();

if (host.endsWith('.cloudfront.net')) {
	router = ${JSON.stringify(defaultRouter)};

	try {
		prefix = (await cf.kvs().get('$active')).split(':')[0] + ':' + router + ':';
	} catch (e) {
		return {
			statusCode: 503,
			statusDescription: 'Service Unavailable'
		};
	}
} else {
	const sub = host.split('.')[0];
	router = sub.slice(0, sub.lastIndexOf('-'));

	try {
		const deploy = await cf.kvs().get('$deploy:' + sub.split('-').pop());
		prefix = deploy.split(':')[0] + ':' + router + ':';
	} catch (e) {
		return {
			statusCode: 404,
			statusDescription: 'Not Found'
		};
	}
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

const CODE = (injection: string[], prefixCode: string, postInjection: string[] = []) => `
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
	} else {
		throw new Error('Unsupported route type');
	}
}

function setS3Origin(route) {
	cf.updateRequestOrigin({
		domainName: route.domainName,
		originAccessControlConfig: {
			enabled: true,
			signingBehavior: 'always',
			signingProtocol: 'sigv4',
			originType: 's3',
		}
	});
}

function setLambdaOrigin(route) {
	cf.updateRequestOrigin({
		domainName: route.domainName,
		timeouts: {
			// CloudFront caps the origin response timeout at 60s without a quota increase.
			readTimeout: 120,
			connectionTimeout: 10,
		},
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
	});
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

	${postInjection.join('\n')}

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

	if(route.type === 's3') {
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
