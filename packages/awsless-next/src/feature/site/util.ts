import { $, Output } from '@awsless/formation'
import { contentType, lookup } from 'mime-types'
import { extname } from 'path'

export const getCacheControl = (file: string) => {
	switch (lookup(file)) {
		case false:
		case 'text/html':
		case 'application/json':
		case 'application/manifest+json':
		case 'application/manifest':
		case 'text/markdown':
			return 's-maxage=31536000, max-age=0'

		default:
			return `public, max-age=31536000, immutable`
	}
}

export const getContentType = (file: string) => {
	return contentType(extname(file)) || 'text/html; charset=utf-8'
}

export const getViewerRequestFunctionCode = (
	domain?: string,
	bucket?: $.aws.s3.Bucket,
	functionUrl?: $.aws.lambda.FunctionUrl
): Output<string> => {
	return $resolve([bucket?.bucketRegionalDomainName, functionUrl?.functionUrl], (bucketDomain, lambdaUrl) => {
		return CF_FUNC_WRAP([
			// --------------------------------------------------------
			// Block direct access to cloudfront.

			domain ? BLOCK_DIRECT_ACCESS_TO_CLOUDFRONT : '',

			// --------------------------------------------------------
			// Define functions.

			bucketDomain ? GET_PREFIXES : '',
			bucketDomain ? SET_S3_ORIGIN : '',
			lambdaUrl ? SET_LAMBDA_ORIGIN : '',

			// --------------------------------------------------------
			// Route asset requests to the s3 bucket.

			bucketDomain ? ROUTE_TO_S3_ORIGIN_IF_STATIC_ASSET(bucketDomain) : '',

			// --------------------------------------------------------
			// Route SSR requests.

			lambdaUrl ? ROUTE_TO_LAMBDA_ORIGIN(lambdaUrl.split('/')[2]!) : '',

			// --------------------------------------------------------
			// Return original response

			bucketDomain && !lambdaUrl ? ROUTE_TO_S3_ORIGIN(bucketDomain) : '',
		])
	})
}

const CF_FUNC_WRAP = (code: string[]) => `
import cf from "cloudfront";

async function handler(event) {
	${code.join('\n')}

	return event.request;
}
`

const BLOCK_DIRECT_ACCESS_TO_CLOUDFRONT = `
if (event.request.headers.host.value.includes('cloudfront.net')) {
	return {
		statusCode: 403,
		statusDescription: 'Forbidden'
	};
}`

// delete event.request.headers['Cookies'];
// delete event.request.headers['cookies'];
// delete event.request.cookies;
const SET_S3_ORIGIN = `
function setS3Origin(s3Domain) {
	const origin = {
		domainName: s3Domain,
		originAccessControlConfig: {
			enabled: true,
			signingBehavior: 'always',
			signingProtocol: 'sigv4',
			originType: 's3',
		}
	};

	console.log("s3 origin")
	console.log(origin)
	cf.updateRequestOrigin(origin);
}`

const SET_LAMBDA_ORIGIN = `
function setLambdaOrigin(urlHost) {
	cf.updateRequestOrigin({
		domainName: urlHost,
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
}`

const GET_PREFIXES = `
function getPostfixes(path) {
	if(path === '') {
		return ['/index.html'];
	}

	if(path.endsWith('/')) {
		return ['index.html'];
	}

	const parts = path.split('/');
	const lastPart = parts[parts.length - 1];

	if(lastPart.includes('.')) {
		return [''];
	}

	return ['', '.html', '/index.html'];
}`

const ROUTE_TO_S3_ORIGIN_IF_STATIC_ASSET = (bucketDomain: string) => `
if (event.request.method === 'GET' || event.request.method === 'HEAD') {
	const s3Domain = '${bucketDomain}';
	const path = decodeURIComponent(event.request.uri);
	const postfixes = getPostfixes(path);

	try {
		const postfix = await Promise.any(
			postfixes.map(p => {
				return cf
					.kvs()
					.get(path + p)
					.then(v => p);
			})
		);

		event.request.uri = event.request.uri + postfix;
		setS3Origin(s3Domain);
		return event.request;
	} catch (e) {}
}`

const ROUTE_TO_S3_ORIGIN = (bucketDomain: string) => `
setS3Origin('${bucketDomain}');`

// Note: In SvelteKit, form action requests contain "/" in request query string
// ie. POST request with query string "?/action"
// CloudFront does not allow query string with "/". It needs to be encoded.
const ROUTE_TO_LAMBDA_ORIGIN = (url: string) => `
for (var key in event.request.querystring) {
	if (key.includes('/')) {
		event.request.querystring[encodeURIComponent(key)] = event.request.querystring[key];
		delete event.request.querystring[key];
	}
}

if (event.request.headers.host) {
	event.request.headers['x-forwarded-host'] = event.request.headers.host;
}

setLambdaOrigin('${url}');`

// {
// 	// images: {
// 	// 	presets: {
// 	// 		px: { width: 2 },
// 	// 		md: { width: 100 },
// 	// 		lg: { width: 200 },
// 	// 	},
// 	// 	extensions: {
// 	// 		jpeg: {},
// 	// 		webp: { effort: 6 }
// 	// 	},
// 	// 	originals: './path',
// 	// 	fetcher: './get-image.ts'
// 	// }
// }
