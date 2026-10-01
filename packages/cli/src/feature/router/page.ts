// The shell shared by the pages the router serves on its own, like the
// login & maintenance pages, so they look like one family.
export const renderPage = (page: {
	title: string
	icon: string
	heading: string
	text: string
	content?: string
	script?: string
}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
<meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
<meta name="theme-color" content="#0a0a0a">
<title>${page.title}</title>
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; min-height: 100svh; display: grid; place-items: center; padding: 24px; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0a0a0a; color: #fff; -webkit-font-smoothing: antialiased; }
main { width: 100%; max-width: 360px; display: grid; justify-items: center; text-align: center; }
.icon { width: 56px; height: 56px; border-radius: 9999px; background: #202020; display: grid; place-items: center; margin-bottom: 24px; }
.icon svg { width: 22px; height: 22px; }
h1 { margin: 0 0 8px; font-size: 28px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.2; text-wrap: balance; }
p { margin: 0; color: #8a8a8a; font-size: 16px; text-wrap: balance; }
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
<div class="icon">${page.icon}</div>
<h1>${page.heading}</h1>
<p>${page.text}</p>
${page.content ?? ''}
<p id="h" class="meta"></p>
</main>
<script>
document.getElementById('h').textContent = location.hostname;
${page.script ?? ''}
</script>
</body>
</html>
`
