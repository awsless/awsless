import { days, Duration, toSeconds } from '@awsless/duration'
import { createHash } from 'crypto'
import { renderPage } from './page.js'

// Reserved router path for the cookie session.
export const LOGIN_PATH = '/__awsless/login'

// S3 echoes the object metadata as a response header, which lets the
// viewer response function tell the login page apart from site content.
export const LOGIN_PAGE_METADATA = { 'awsless-login': '1' }
export const LOGIN_PAGE_HEADER = 'x-amz-meta-awsless-login'

export type CookieAuth = {
	name: string
	// The viewer request function signs the session expiry with this secret.
	secret: string
	password: string
	domain?: string
	// How long a signed session stays valid.
	validity: number
	// A temporary session leaves the cookie without a max age, so the browser drops it when it closes.
	maxAge?: number
}

// A temporary session still needs a signed bound, or the cookie could be replayed forever.
export const TEMPORARY_SESSION_VALIDITY = days(1)

// The cookie name carries its own password derived suffix, so routers on
// one root domain with different passwords never overwrite each other's session.
export const createCookieAuth = (props: {
	password: string
	sessionDuration: Duration | 'temporary'
	domain?: string
}): CookieAuth => {
	const temporary = props.sessionDuration === 'temporary'
	const validity = toSeconds(props.sessionDuration === 'temporary' ? TEMPORARY_SESSION_VALIDITY : props.sessionDuration)
	const hash = (scope: string) => {
		return createHash('sha256').update(`awsless:router:${scope}:${props.password}`).digest('hex')
	}

	return {
		name: `awsless-auth-${hash('cookie').slice(0, 8)}`,
		secret: hash('secret'),
		password: props.password,
		domain: props.domain,
		validity,
		maxAge: temporary ? undefined : validity,
	}
}

// The page lives in the asset bucket, so the viewer request function
// only rewrites unauthenticated page loads to it.
export const LOGIN_PAGE = renderPage({
	title: 'Protected',
	icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.75" r="1.1" fill="#fff" stroke="none"/></svg>',
	heading: 'This site is protected',
	text: 'Enter the password to continue.',
	content: `<form id="f">
<input id="p" type="password" placeholder="Password" autocomplete="current-password" enterkeyhint="go" required autofocus>
<button>Continue</button>
<p id="e" class="error" hidden>Wrong password, try again.</p>
</form>`,
	script: `var f = document.getElementById('f'), p = document.getElementById('p'), e = document.getElementById('e'), vv = window.visualViewport;
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
});`,
})
