// The dev dashboard is a single self-contained page, so the cli ships
// no frontend build or dependencies.
export const dashboardHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>awsless dev</title>
<style>
	:root {
		--bg: #0f1115;
		--panel: #171a21;
		--border: #262b36;
		--text: #d7dae0;
		--muted: #7d8590;
		--accent: #f5a623;
		--good: #3fb950;
		--bad: #f85149;
		font-size: 14px;
	}
	* { box-sizing: border-box; }
	body {
		margin: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		background: var(--bg);
		color: var(--text);
		display: grid;
		grid-template-columns: 220px 1fr;
		height: 100vh;
	}
	body.with-events { grid-template-columns: 220px 1fr 320px; }
	aside {
		border-left: 1px solid var(--border);
		overflow-y: auto;
		padding: 12px;
	}
	aside h3 {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--muted);
		margin: 8px 8px 12px;
	}
	aside .event {
		border-bottom: 1px solid var(--border);
		padding: 8px;
		font-size: 12px;
	}
	aside .event .head { display: flex; gap: 8px; align-items: baseline; }
	aside .event .time { color: var(--muted); }
	aside .event .topic { font-weight: bold; }
	aside .event .type { color: var(--muted); }
	aside .event .body {
		color: var(--muted);
		margin-top: 4px;
		word-break: break-word;
		white-space: pre-wrap;
	}
	aside .empty { padding: 8px; }
	.logs {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 8px;
		margin-top: 8px;
		max-height: 420px;
		overflow-y: auto;
		font-size: 12px;
	}
	.logs .line { display: flex; gap: 8px; padding: 1px 0; }
	.logs .time { color: var(--muted); flex-shrink: 0; }
	.logs .text { white-space: pre-wrap; word-break: break-word; }
	.config-form { display: flex; flex-direction: column; gap: 8px; max-width: 520px; }
	.config-form .field { display: grid; grid-template-columns: 180px 1fr; gap: 12px; align-items: center; }
	.config-form .name { color: var(--muted); overflow-wrap: anywhere; }
	.config-form input {
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 6px 10px;
		font: inherit;
	}
	.config-form input::placeholder { color: var(--muted); }
	nav {
		border-right: 1px solid var(--border);
		overflow-y: auto;
		padding: 12px;
	}
	nav h1 {
		font-size: 15px;
		margin: 4px 8px 16px;
		color: var(--accent);
		cursor: pointer;
	}
	nav h1 span { color: var(--muted); font-weight: normal; }
	nav button {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		background: none;
		border: none;
		color: var(--text);
		font: inherit;
		padding: 6px 8px;
		border-radius: 6px;
		cursor: pointer;
	}
	nav button .count { margin-left: auto; }
	nav button.reseed { margin-top: auto; color: var(--muted); }
	nav button.reseed:disabled { cursor: default; }
	.icon {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		display: inline-flex;
		color: var(--muted);
	}
	.icon svg { width: 100%; height: 100%; }
	nav button.active .icon, .row:hover .icon { color: var(--accent); }
	main h2 { display: flex; align-items: center; gap: 8px; }
	main h2 .icon { width: 17px; height: 17px; }
	nav button:hover { background: var(--panel); }
	nav button.active { background: var(--panel); color: var(--accent); }
	nav button .count { color: var(--muted); }
	main { padding: 20px 24px; overflow-y: auto; }
	main h2 { margin: 0 0 4px; font-size: 16px; }
	main .detail { color: var(--muted); margin-bottom: 16px; word-break: break-all; }
	main .back {
		display: inline-block;
		background: none;
		border: none;
		color: var(--muted);
		font: inherit;
		padding: 0;
		margin-bottom: 12px;
		cursor: pointer;
	}
	main .back:hover { color: var(--accent); }
	main h3 {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--muted);
		margin: 24px 0 8px;
	}
	.feed .row { cursor: default; }
	.feed .empty { padding: 8px; }
	.filters { display: flex; gap: 8px; margin-bottom: 12px; }
	.filters input, .filters select {
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 6px 10px;
		font: inherit;
	}
	.filters input { flex: 1; }
	.filters input::placeholder { color: var(--muted); }
	.filters .count { color: var(--muted); align-self: center; white-space: nowrap; }
	/* The stack & name columns share one grid across every row, so the
	   names line up no matter how long each stack name is. */
	.rows { display: grid; grid-template-columns: fit-content(280px) 1fr auto; }
	.rows > .empty { grid-column: 1 / -1; }
	.row {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
		gap: 12px;
		align-items: baseline;
		text-align: left;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		font: inherit;
		padding: 8px;
		cursor: pointer;
	}
	.row:hover { background: var(--panel); }
	.row .stack {
		color: var(--muted);
		min-width: 90px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row .id {
		font-weight: bold;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row .info {
		color: var(--muted);
		justify-self: end;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}
	textarea {
		width: 100%;
		min-height: 120px;
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 10px;
		font: inherit;
		resize: vertical;
	}
	.actions { margin: 12px 0; display: flex; gap: 8px; align-items: center; }
	.actions .status { color: var(--muted); }
	button.primary {
		background: var(--accent);
		color: #14100a;
		border: none;
		border-radius: 6px;
		padding: 7px 16px;
		font: inherit;
		font-weight: bold;
		cursor: pointer;
	}
	button.primary:disabled { opacity: 0.5; cursor: wait; }
	pre.result {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}
	pre.result.error { border-color: var(--bad); color: var(--bad); }
	table { border-collapse: collapse; width: 100%; }
	th, td {
		border: 1px solid var(--border);
		padding: 6px 10px;
		text-align: left;
		vertical-align: top;
		max-width: 360px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	th { color: var(--muted); font-weight: normal; }
	td:hover { white-space: normal; word-break: break-all; }
	.empty { color: var(--muted); }
</style>
</head>
<body>
<nav id="nav"><h1>awsless <span>dev</span></h1></nav>
<main id="main"><p class="empty">Loading...</p></main>
<script type="application/json" id="state-data">__STATE__</script>
<aside id="events" hidden><h3>Live events</h3><div id="events-feed"><p class="empty">Waiting for events...</p></div></aside>
<script>
const $ = (tag, attrs = {}, children = []) => {
	const el = document.createElement(tag)
	Object.assign(el, attrs)
	for (const child of [].concat(children)) {
		el.append(child)
	}
	return el
}

const api = async (path, options) => {
	const res = await fetch(path, options)
	const data = await res.json()
	if (!res.ok) throw new Error(data.error ?? res.statusText)
	return data
}

const GROUPS = [
	['site', 'Sites'],
	['function', 'Functions'],
	['cron', 'Crons'],
	['task', 'Tasks'],
	['queue', 'Queues'],
	['topic', 'Topics'],
	['subscriber', 'Subscribers'],
	['pubsub', 'PubSub'],
	['rpc', 'RPC'],
	['rest', 'REST'],
	['image', 'Images'],
	['icon', 'Icons'],
	['table', 'Tables'],
	['cache', 'Caches'],
	['search', 'Searches'],
	['store', 'Stores'],
	['config', 'Config'],
	['route', 'Routes'],
]

const svg = inner =>
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'

const ICONS = {
	function: svg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
	cron: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
	task: svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
	queue: svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
	topic: svg('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
	subscriber: svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
	pubsub: svg('<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>'),
	rpc: svg('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
	rest: svg('<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>'),
	image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
	icon: svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
	table: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/>'),
	cache: svg('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
	search: svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
	store: svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
	config: svg('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
	route: svg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
	site: svg('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),
	seed: svg('<path d="M12 22V8"/><path d="M12 8C12 5 9 2 5 2c0 4 3 6 7 6z"/><path d="M12 12c0-3 3-6 7-6 0 4-3 6-7 6z"/>'),
}

const icon = kind => {
	const el = $('span', { className: 'icon' })
	el.innerHTML = ICONS[kind] ?? ''
	return el
}

let state
let cleanupPanel
const view = { kind: null, resource: null }
const filter = { query: '', stack: '' }

const label = r => (r.stack ? r.stack + ' / ' + r.id : r.id)
const groupTitle = kind => GROUPS.find(([k]) => k === kind)?.[1] ?? kind

// ------------------------------------------------------------------
// Url routing: /functions lists the function resources, and
// /functions/<stack>/<id> opens one, so every view is a plain url.

const slugFor = kind => groupTitle(kind).toLowerCase()
const kindFor = slug => GROUPS.find(([, title]) => title.toLowerCase() === slug)?.[0]

const filterParams = () => {
	const params = new URLSearchParams()
	if (filter.query) params.set('q', filter.query)
	if (filter.stack) params.set('stack', filter.stack)
	return params.toString()
}

const listUrl = kind => {
	const params = filterParams()
	return '/' + slugFor(kind) + (params ? '?' + params : '')
}

const resourceUrl = r => {
	const url = '/' + slugFor(r.kind) + '/' + encodeURIComponent(r.stack ?? '-') + '/' + encodeURIComponent(r.id)
	// Routers can define the same route pattern, so route urls carry
	// the router id to stay unique.
	return r.router ? url + '?router=' + encodeURIComponent(r.router) : url
}

const selectKind = kind => {
	view.kind = kind
	view.resource = null
	filter.query = ''
	filter.stack = ''
	history.pushState(null, '', listUrl(kind))
	render()
}

const selectResource = r => {
	view.resource = r
	history.pushState(null, '', resourceUrl(r))
	render()
}

const showHome = () => {
	view.kind = null
	view.resource = null
	history.pushState(null, '', '/')
	render()
}

const applyLocation = () => {
	const segments = location.pathname.split('/').filter(Boolean).map(decodeURIComponent)
	const params = new URLSearchParams(location.search)

	view.kind = kindFor(segments[0]) ?? null
	view.resource = null
	filter.query = params.get('q') ?? ''
	filter.stack = params.get('stack') ?? ''

	if (view.kind && segments.length >= 3) {
		const router = params.get('router')
		const matches = state.resources.filter(r =>
			r.kind === view.kind && (r.stack ?? '-') === segments[1] && r.id === segments[2]
		)
		view.resource = (router ? matches.find(r => r.router === router) : matches[0]) ?? null
	}

	render()
}

window.addEventListener('popstate', applyLocation)

// ------------------------------------------------------------------
// Detail panels

const invokePanel = (main, r) => {
	const placeholder = JSON.stringify(r.envelope ?? {}, null, 2)
	const input = $('textarea', { value: placeholder, spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('pre', { className: 'result', hidden: true })
	const run = $('button', { className: 'primary', textContent: r.kind === 'topic' ? 'Publish' : 'Invoke' })

	run.onclick = async () => {
		run.disabled = true
		status.textContent = ''
		const started = Date.now()
		try {
			const event = input.value.trim() ? JSON.parse(input.value) : undefined
			const body = r.kind === 'topic'
				? { topic: r.detail, message: event }
				: { routeKey: r.routeKey, event }
			const path = r.kind === 'topic' ? '/api/publish' : '/api/invoke'
			const data = await api(path, { method: 'POST', body: JSON.stringify(body) })
			result.className = 'result'
			result.textContent = JSON.stringify(data.result ?? null, null, 2)
			status.textContent = (Date.now() - started) + 'ms'
		} catch (error) {
			result.className = 'result error'
			result.textContent = String(error.message ?? error)
		}
		result.hidden = false
		run.disabled = false
	}

	main.append(
		input,
		$('div', { className: 'actions' }, [run, status]),
		result,
	)
}

const pubsubPanel = (main, r) => {
	const topic = $('input', { placeholder: 'topic', value: 'my-topic', autocomplete: 'off' })
	const event = $('input', { placeholder: 'event', value: 'my-event', autocomplete: 'off' })
	const payload = $('textarea', { value: '{}', spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('pre', { className: 'result', hidden: true })
	const run = $('button', { className: 'primary', textContent: 'Publish' })

	run.onclick = async () => {
		run.disabled = true
		status.textContent = ''
		const started = Date.now()
		try {
			const message = {
				topic: topic.value.trim(),
				event: event.value.trim(),
				payload: payload.value.trim() ? JSON.parse(payload.value) : undefined,
			}
			const data = await api('/api/invoke', {
				method: 'POST',
				body: JSON.stringify({ routeKey: r.routeKey, event: message }),
			})
			result.className = 'result'
			result.textContent = JSON.stringify(data.result ?? null, null, 2)
			status.textContent = 'Published to every subscriber of "' + message.topic + '" in ' + (Date.now() - started) + 'ms'
		} catch (error) {
			result.className = 'result error'
			result.textContent = String(error.message ?? error)
		}
		result.hidden = false
		run.disabled = false
	}

	main.append(
		$('div', { className: 'filters' }, [topic, event]),
		payload,
		$('div', { className: 'actions' }, [run, status]),
		result,
	)

	cleanupPanel = showEventsFeed(r.id)
}

const rpcPanel = (main, r) => {
	if ((r.queries ?? []).length === 0) {
		main.append($('p', { className: 'empty' }, 'No rpc functions are defined.'))
		return
	}

	const query = $('select', {}, r.queries.map(name => $('option', { value: name, textContent: name })))

	// The token rides the same "authentication" header the rpc client
	// sends, & sticks around per api so a page reload keeps it.
	const authKey = 'rpc-auth-token:' + r.routeKey
	const auth = $('input', {
		type: 'text',
		placeholder: 'Auth token (optional)',
		value: localStorage.getItem(authKey) ?? '',
		autocomplete: 'off',
		spellcheck: false,
	})
	auth.oninput = () => localStorage.setItem(authKey, auth.value)

	const payload = $('textarea', { value: '{}', spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('pre', { className: 'result', hidden: true })
	const run = $('button', { className: 'primary', textContent: 'Call' })

	run.onclick = async () => {
		run.disabled = true
		status.textContent = ''
		const started = Date.now()
		try {
			const parsed = payload.value.trim() ? JSON.parse(payload.value) : undefined

			// The same lambda url event the local router sends the rpc
			// server for a real request.
			const event = {
				version: '2.0',
				rawPath: '/',
				requestContext: { http: { method: 'POST', userAgent: 'awsless dev dashboard', sourceIp: '127.0.0.1' } },
				headers: {
					'content-type': 'application/json',
					...(auth.value.trim() ? { authentication: auth.value.trim() } : {}),
				},
				body: JSON.stringify([{ name: query.value, ...(parsed === undefined ? {} : { payload: parsed }) }]),
			}

			const data = await api('/api/invoke', {
				method: 'POST',
				body: JSON.stringify({ routeKey: r.routeKey, event }),
			})

			let body = data.result?.body
			try { body = JSON.parse(body) } catch (_) {}

			result.className = 'result'
			result.textContent = JSON.stringify(body ?? data.result ?? null, null, 2)
			status.textContent = (data.result?.statusCode ?? '') + ' · ' + (Date.now() - started) + 'ms'
		} catch (error) {
			result.className = 'result error'
			result.textContent = String(error.message ?? error)
		}
		result.hidden = false
		run.disabled = false
	}

	main.append(
		$('div', { className: 'filters' }, [query, auth]),
		payload,
		$('div', { className: 'actions' }, [run, status]),
		result,
	)
}

// ------------------------------------------------------------------
// Live log feed

// A terminal-style view streaming a resource's live event channel,
// like the dev server output of a site. The bus replays the recent
// lines, so the boot output shows even when the panel opens later.
const attachLogFeed = (main, channel) => {
	main.append($('h3', {}, 'Logs'))

	const feed = $('div', { className: 'logs' }, $('p', { className: 'empty' }, 'Waiting for output...'))
	main.append(feed)

	const source = new EventSource('/api/events?channel=' + encodeURIComponent(channel))

	source.onmessage = message => {
		const data = JSON.parse(message.data)

		feed.querySelector('.empty')?.remove()
		feed.append($('div', { className: 'line' }, [
			$('span', { className: 'time' }, new Date(data.date).toLocaleTimeString()),
			$('span', { className: 'text' }, data.line),
		]))

		// Only the last 200 lines stay around, pinned to the bottom.
		while (feed.children.length > 200) {
			feed.firstChild.remove()
		}

		feed.scrollTop = feed.scrollHeight
	}

	return () => source.close()
}

// ------------------------------------------------------------------
// Live events sidebar

// The feed only shows while a pubsub instance panel is open & only
// streams the events of that instance.
const showEventsFeed = id => {
	document.body.classList.add('with-events')

	const aside = document.getElementById('events')
	const feed = document.getElementById('events-feed')

	aside.hidden = false
	feed.innerHTML = '<p class="empty">Waiting for events...</p>'

	const source = new EventSource('/api/events?channel=' + encodeURIComponent('pubsub:' + id))

	source.onmessage = message => {
		const data = JSON.parse(message.data)

		feed.querySelector('.empty')?.remove()
		feed.prepend($('div', { className: 'event' }, [
			$('div', { className: 'head' }, [
				$('span', { className: 'time' }, new Date(data.date).toLocaleTimeString()),
				$('span', { className: 'topic' }, data.kind === 'message' ? data.topic : data.event),
				$('span', { className: 'type' }, data.kind === 'message' ? data.event : 'lifecycle'),
			]),
			...(data.payload === undefined
				? []
				: [$('div', { className: 'body' }, JSON.stringify(data.payload))]),
		]))

		// The newest event sits on top & only the last 25 stay around.
		while (feed.children.length > 25) {
			feed.lastChild.remove()
		}
	}

	return () => {
		source.close()
		aside.hidden = true
		document.body.classList.remove('with-events')
	}
}

const tablePanel = async (main, r) => {
	const holder = $('div', {}, $('p', { className: 'empty' }, 'Scanning...'))
	main.append(holder)

	try {
		const data = await api('/api/table?name=' + encodeURIComponent(r.detail))
		holder.innerHTML = ''

		if (data.items.length === 0) {
			holder.append($('p', { className: 'empty' }, 'The table is empty.'))
			return
		}

		const columns = [...new Set(data.items.flatMap(item => Object.keys(item)))]
		holder.append($('table', {}, [
			$('tr', {}, columns.map(c => $('th', {}, c))),
			...data.items.map(item => $('tr', {}, columns.map(c => $('td', {},
				typeof item[c] === 'undefined' ? '' : JSON.stringify(item[c])
			)))),
		]))
	} catch (error) {
		holder.innerHTML = ''
		holder.append($('pre', { className: 'result error' }, String(error.message ?? error)))
	}
}

const cachePanel = async (main, r) => {
	const holder = $('div', {}, $('p', { className: 'empty' }, 'Scanning...'))
	main.append(holder)

	try {
		const data = await api('/api/cache?target=' + encodeURIComponent(r.detail))
		holder.innerHTML = ''

		if (data.entries.length === 0) {
			holder.append($('p', { className: 'empty' }, 'The cache is empty.'))
			return
		}

		holder.append($('table', {}, [
			$('tr', {}, [$('th', {}, 'Db'), $('th', {}, 'Key'), $('th', {}, 'Type'), $('th', {}, 'TTL'), $('th', {}, 'Value')]),
			...data.entries.map(entry => $('tr', {}, [
				$('td', {}, String(entry.db)),
				$('td', {}, entry.key),
				$('td', {}, entry.type),
				$('td', {}, entry.ttl < 0 ? '-' : entry.ttl + 's'),
				$('td', {}, typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value)),
			])),
		]))
	} catch (error) {
		holder.innerHTML = ''
		holder.append($('pre', { className: 'result error' }, String(error.message ?? error)))
	}
}

const searchPanel = async (main, r) => {
	const proxy = (path, body) =>
		api('/api/search', { method: 'POST', body: JSON.stringify({ target: r.detail, path, body }) })

	const indices = $('div', {}, $('p', { className: 'empty' }, 'Loading indices...'))
	const index = $('select', {})
	const query = $('textarea', { value: JSON.stringify({ query: { match_all: {} }, size: 10 }, null, 2), spellcheck: false })
	const status = $('span', { className: 'status' })
	const result = $('div', {})
	const run = $('button', { className: 'primary', textContent: 'Search' })

	run.onclick = async () => {
		run.disabled = true
		status.textContent = ''
		result.innerHTML = ''
		try {
			const { data } = await proxy('/' + encodeURIComponent(index.value) + '/_search', JSON.parse(query.value))

			if (data.error) {
				result.append($('pre', { className: 'result error' }, JSON.stringify(data.error, null, 2)))
			} else {
				const hits = data.hits?.hits ?? []
				status.textContent = (data.hits?.total?.value ?? 0) + ' hits · ' + data.took + 'ms'

				if (hits.length === 0) {
					result.append($('p', { className: 'empty' }, 'No hits.'))
				} else {
					const columns = [...new Set(hits.flatMap(hit => Object.keys(hit._source ?? {})))]
					result.append($('table', {}, [
						$('tr', {}, [$('th', {}, '_id'), ...columns.map(c => $('th', {}, c))]),
						...hits.map(hit => $('tr', {}, [
							$('td', {}, hit._id),
							...columns.map(c => $('td', {},
								typeof hit._source?.[c] === 'undefined' ? '' : JSON.stringify(hit._source[c])
							)),
						])),
					]))
				}
			}
		} catch (error) {
			result.append($('pre', { className: 'result error' }, String(error.message ?? error)))
		}
		run.disabled = false
	}

	main.append(
		$('h3', {}, 'Indices'),
		indices,
		$('h3', {}, 'Query'),
		$('div', { className: 'filters' }, [index]),
		query,
		$('div', { className: 'actions' }, [run, status]),
		result,
	)

	try {
		const { data } = await proxy('/_cat/indices?format=json&h=index,health,docs.count,store.size&s=index')
		const rows = data.filter(entry => !entry.index.startsWith('.'))

		indices.innerHTML = ''

		if (rows.length === 0) {
			indices.append($('p', { className: 'empty' }, 'No indices exist yet.'))
			return
		}

		for (const entry of rows) {
			index.append($('option', { value: entry.index, textContent: entry.index }))
		}

		indices.append($('table', {}, [
			$('tr', {}, [$('th', {}, 'Index'), $('th', {}, 'Health'), $('th', {}, 'Docs'), $('th', {}, 'Size')]),
			...rows.map(entry => $('tr', {}, [
				$('td', {}, entry.index),
				$('td', {}, entry.health),
				$('td', {}, entry['docs.count'] ?? '-'),
				$('td', {}, entry['store.size'] ?? '-'),
			])),
		]))
	} catch (error) {
		indices.innerHTML = ''
		indices.append($('pre', { className: 'result error' }, String(error.message ?? error)))
	}
}

const storePanel = async (main, r) => {
	const holder = $('div', {}, $('p', { className: 'empty' }, 'Listing...'))
	main.append(holder)

	const data = await api('/api/store?prefix=' + encodeURIComponent(r.detail))
	holder.innerHTML = ''

	if (data.files.length === 0) {
		holder.append($('p', { className: 'empty' }, 'The store is empty.'))
		return
	}

	holder.append($('table', {}, [
		$('tr', {}, [$('th', {}, 'Key'), $('th', {}, 'Size'), $('th', {}, 'Modified')]),
		...data.files.map(file => $('tr', {}, [
			$('td', {}, file.key.slice(r.detail.length)),
			$('td', {}, String(file.size)),
			$('td', {}, file.modified),
		])),
	]))
}

// One input per defined config, saved back to the local config file.
const configPanel = async (main) => {
	const names = [...new Set(state.resources.filter(r => r.kind === 'config').map(r => r.id))].sort()
	const data = await api('/api/config')
	const values = data.values ?? {}
	const pulled = new Set(data.pulled ?? [])

	const inputs = new Map()
	const form = $('div', { className: 'config-form' })

	for (const name of names) {
		// An empty input falls through to the value pulled from ssm on
		// boot - the placeholder shows whether the pull provided one.
		const input = $('input', {
			value: values[name] ?? '',
			placeholder: pulled.has(name) ? 'pulled from ssm' : 'not set',
			spellcheck: false,
		})
		inputs.set(name, input)
		form.append($('label', { className: 'field' }, [$('span', { className: 'name' }, name), input]))
	}

	if (names.length === 0) {
		form.append($('p', { className: 'empty' }, 'No configs defined.'))
	}

	const status = $('span', { className: 'status' })
	const save = $('button', { className: 'primary', textContent: 'Save' })

	save.onclick = async () => {
		save.disabled = true
		try {
			// Unknown keys in the file survive, empty inputs unset.
			const next = { ...values }

			for (const [name, input] of inputs) {
				if (input.value === '') {
					delete next[name]
				} else {
					next[name] = input.value
				}
			}

			await api('/api/config', { method: 'PUT', body: JSON.stringify(next) })
			status.textContent = 'Saved. The worker restarts automatically.'
		} catch (error) {
			status.textContent = String(error.message ?? error)
		}
		save.disabled = false
	}

	main.append(form, $('div', { className: 'actions' }, [save, status]))
}

const renderResource = main => {
	const r = view.resource
	const back = $('button', { className: 'back' }, '← ' + groupTitle(r.kind))

	back.onclick = () => {
		view.resource = null
		history.pushState(null, '', listUrl(r.kind))
		render()
	}

	main.append(
		back,
		$('h2', {}, label(r)),
		$('p', { className: 'detail' }, [r.kind, r.detail ? ' · ' + r.detail : '', r.routeKey ? ' · ' + r.routeKey : '']),
	)

	if (r.kind === 'pubsub') return pubsubPanel(main, r)
	if (r.kind === 'rpc') return rpcPanel(main, r)
	if (r.kind === 'search') return searchPanel(main, r)
	if (r.kind === 'table') return tablePanel(main, r)
	if (r.kind === 'cache') return cachePanel(main, r)
	if (r.kind === 'store') return storePanel(main, r)
	if (r.kind === 'config') return configPanel(main)
	if (r.kind === 'route' || r.kind === 'site') {
		const url = r.url ?? r.detail
		main.append($('p', {}, $('a', { href: url, target: '_blank', style: 'color: var(--accent)' }, url)))

		if (r.channel) {
			cleanupPanel = attachLogFeed(main, r.channel)
		}

		return
	}
	invokePanel(main, r)
}

// ------------------------------------------------------------------
// Kind list

const renderList = main => {
	const items = state.resources.filter(r => r.kind === view.kind)
	const stacks = [...new Set(items.map(r => r.stack).filter(Boolean))].sort()

	main.append($('h2', {}, groupTitle(view.kind)))

	// The config page is a single form over every defined value,
	// instead of a resource list.
	if (view.kind === 'config') {
		return configPanel(main)
	}

	const matches = r => {
		if (filter.stack && r.stack !== filter.stack) return false
		if (!filter.query) return true

		return (r.stack + ' ' + r.id + ' ' + (r.detail ?? ''))
			.toLowerCase()
			.includes(filter.query.toLowerCase())
	}

	const rows = $('div', { className: 'rows' })
	const count = $('span', { className: 'count' })

	const renderRows = () => {
		rows.innerHTML = ''
		const visible = items.filter(matches)

		count.textContent = visible.length + ' of ' + items.length

		if (visible.length === 0) {
			rows.append($('p', { className: 'empty' }, 'Nothing matches.'))
			return
		}

		for (const r of visible) {
			const row = $('button', { className: 'row' }, [
				$('span', { className: 'stack' }, r.stack ?? '-'),
				$('span', { className: 'id' }, r.id),
				$('span', { className: 'info' }, r.detail ?? ''),
			])
			row.onclick = () => selectResource(r)
			rows.append(row)
		}
	}

	const search = $('input', {
		type: 'search',
		placeholder: 'Filter by name... ( / )',
		value: filter.query,
		autocomplete: 'off',
		id: 'list-filter',
	})
	search.oninput = () => {
		filter.query = search.value.trim()
		history.replaceState(null, '', listUrl(view.kind))
		renderRows()
	}

	const stackSelect = $('select', {}, [
		$('option', { value: '', textContent: 'All stacks' }),
		...stacks.map(stack => $('option', { value: stack, textContent: stack })),
	])
	stackSelect.value = filter.stack
	stackSelect.onchange = () => {
		filter.stack = stackSelect.value
		history.replaceState(null, '', listUrl(view.kind))
		renderRows()
	}

	const controls = [search]
	if (stacks.length > 1) controls.push(stackSelect)
	controls.push(count)

	main.append($('div', { className: 'filters' }, controls), rows)
	renderRows()
	search.focus()
}

// ------------------------------------------------------------------

const render = () => {
	// Panels with live connections clean up when the view changes.
	cleanupPanel?.()
	cleanupPanel = undefined

	const nav = document.getElementById('nav')
	nav.innerHTML = '<h1>awsless <span>dev</span></h1>'
	nav.querySelector('h1').onclick = showHome

	for (const [kind, title] of GROUPS) {
		const count = state.resources.filter(r => r.kind === kind).length
		if (count === 0) continue

		const button = $('button', { className: view.kind === kind ? 'active' : '' }, [
			icon(kind),
			title,
			$('span', { className: 'count' }, String(count)),
		])
		button.onclick = () => selectKind(kind)
		nav.append(button)
	}

	if (state.seeds) {
		const reseed = $('button', { className: 'reseed' }, [icon('seed'), 'Reset & seed'])
		let armed = false
		let disarm

		reseed.onclick = async () => {
			// The reset wipes all local data, so it asks for a second
			// click before running.
			if (!armed) {
				armed = true
				reseed.lastChild.textContent = 'Click to confirm'
				disarm = setTimeout(() => {
					armed = false
					reseed.lastChild.textContent = 'Reset & seed'
				}, 3000)
				return
			}

			clearTimeout(disarm)
			armed = false
			reseed.disabled = true
			reseed.lastChild.textContent = 'Seeding...'

			try {
				const res = await fetch('/api/seed', { method: 'POST' })
				const data = await res.json()
				reseed.lastChild.textContent = data.ok ? 'Done' : 'Failed'
			} catch {
				reseed.lastChild.textContent = 'Failed'
			}

			setTimeout(() => {
				reseed.disabled = false
				reseed.lastChild.textContent = 'Reset & seed'
			}, 2000)
		}

		nav.append(reseed)
	}

	const main = document.getElementById('main')
	main.innerHTML = ''

	if (view.resource) {
		renderResource(main)
	} else if (view.kind) {
		renderList(main)
	} else {
		main.append($('p', { className: 'empty' }, 'Select a feature to browse its resources.'))
	}
}

document.addEventListener('keydown', event => {
	const search = document.getElementById('list-filter')

	if (event.key === '/' && search && document.activeElement !== search) {
		event.preventDefault()
		search.focus()
		search.select()
	}
})

// The state ships inside the page, so the sidebar renders without a
// single network request.
try {
	state = JSON.parse(document.getElementById('state-data').textContent)
	document.title = state.app + ' · awsless dev'
	state.resources = [
		...state.resources,
		// Proxy routes carry no route key & are already listed by
		// the feature that owns them.
		...state.routes.filter(route => route.routeKey).map(route => ({
			kind: 'route',
			id: route.pattern,
			stack: route.routeKey.split(':')[0],
			router: route.routerId,
			detail: route.routeKey,
			url: 'http://localhost:' + state.routerPorts[route.routerId] + route.pattern.split('{')[0].replace(/\\*$/, ''),
		})),
	]
	applyLocation()
} catch (error) {
	document.getElementById('main').innerHTML =
		'<pre class="result error">Loading the dashboard failed: ' + String(error.message ?? error) + '</pre>'
}
</script>
</body>
</html>
`
