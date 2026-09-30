import { Duration, toSeconds } from '@awsless/duration'
import { createHash } from 'crypto'

// Reserved router path for the cookie session.
export const LOGIN_PATH = '/__awsless/login'

// S3 echoes the object metadata as a response header, which lets the
// viewer response function tell the login page apart from site content.
export const LOGIN_PAGE_METADATA = { 'awsless-login': '1' }
export const LOGIN_PAGE_HEADER = 'x-amz-meta-awsless-login'

export type CookieAuth = {
	// The viewer request function compares the cookie against this static token.
	name: string
	token: string
	password: string
	domain?: string
	maxAge: number
}

// The cookie name carries its own password derived suffix, so routers on
// one root domain with different passwords never overwrite each other's session.
export const createCookieAuth = (props: {
	password: string
	sessionDuration: Duration
	domain?: string
}): CookieAuth => {
	const hash = (scope: string) => {
		return createHash('sha256').update(`awsless:router:${scope}:${props.password}`).digest('hex')
	}

	return {
		name: `awsless-auth-${hash('cookie').slice(0, 8)}`,
		token: hash('token'),
		password: props.password,
		domain: props.domain,
		maxAge: toSeconds(props.sessionDuration),
	}
}

// The page lives in the asset bucket, so the viewer request function
// only rewrites unauthenticated page loads to it.
export const LOGIN_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
<meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
<meta name="theme-color" content="#0a0a0a">
<title>Protected</title>
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; min-height: 100svh; display: grid; place-items: center; padding: 24px; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0a0a0a; color: #fff; -webkit-font-smoothing: antialiased; }
main { width: 100%; max-width: 360px; display: grid; justify-items: center; text-align: center; }
.icon { width: 56px; height: 56px; border-radius: 9999px; background: #202020; display: grid; place-items: center; margin-bottom: 24px; }
.icon svg { width: 22px; height: 22px; }
h1 { margin: 0 0 8px; font-size: 28px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.2; }
p { margin: 0; color: #8a8a8a; font-size: 16px; }
form { width: 100%; display: grid; gap: 10px; margin-top: 32px; }
input { width: 100%; height: 48px; padding: 0 20px; border-radius: 9999px; border: 1px solid #262626; background: #141414; color: #fff; font: inherit; outline: none; text-align: center; }
input::placeholder { color: #6a6a6a; }
input:focus-visible { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4); }
button { height: 48px; padding: 0 20px; border-radius: 9999px; border: 0; background: #fff; color: #0a0a0a; font: inherit; font-size: 15px; font-weight: 500; cursor: pointer; }
button:hover { background: #e6e6e6; }
.error { margin-top: 6px; color: #ff4d4d; font-size: 14px; }
.meta { margin-top: 24px; color: #6a6a6a; font-size: 13px; }
</style>
</head>
<body>
<main>
<div class="icon">
<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.75" r="1.1" fill="#fff" stroke="none"/></svg>
</div>
<h1>This site is protected</h1>
<p>Enter the password to continue.</p>
<form id="f">
<input id="p" type="password" placeholder="Password" autocomplete="current-password" enterkeyhint="go" required autofocus>
<button>Continue</button>
<p id="e" class="error" hidden>Wrong password, try again.</p>
</form>
<p id="h" class="meta"></p>
</main>
<script>
var f = document.getElementById('f'), p = document.getElementById('p'), e = document.getElementById('e'), vv = window.visualViewport;
document.getElementById('h').textContent = location.hostname;
// The layout viewport ignores the keyboard on iOS, so the body follows the visible area to keep the form above it.
if (vv) {
	// Safari scrolls the focused field into view before the resize lands, so the page returns to the top once it has.
	var fit = function () { document.body.style.minHeight = vv.height + 'px'; window.scrollTo(0, 0); };
	vv.addEventListener('resize', fit);
	fit();
}
f.addEventListener('submit', function (ev) {
	ev.preventDefault();
	e.hidden = true;
	fetch(${JSON.stringify(LOGIN_PATH)}, { method: 'POST', headers: { authorization: 'Password ' + p.value } }).then(function (r) {
		if (r.ok) { location.reload(); } else { e.hidden = false; p.select(); }
	});
});
</script>
</body>
</html>
`
