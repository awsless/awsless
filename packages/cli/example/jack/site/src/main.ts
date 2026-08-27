import './style.css'

type Task = { id: string; name: string; done: boolean }

// The value of the "admin-secret" config in .awsless/local/config.json
const secret = 'secret'

const rpc = async <T>(name: string, payload?: Record<string, unknown>): Promise<T> => {
	const body = JSON.stringify([payload ? { name, payload } : { name }])

	// CloudFront signs the origin request to the lambda url with OAC,
	// but never hashes the body itself - a POST must carry its own
	// payload hash, or the signature check rejects the request.
	const bytes = new TextEncoder().encode(body)
	const hash = await crypto.subtle.digest('SHA-256', bytes)
	const contentSha256 = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')

	const response = await fetch('/api', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-amz-content-sha256': contentSha256,
			authentication: secret,
		},
		body,
	})

	const [result] = await response.json()

	if (!result.ok) {
		throw new Error(`RPC call "${name}" failed`)
	}

	return result.data
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
	<main>
		<header>
			<img src="/images/logo.png/default.png" alt="" />
			<h1>Todo</h1>
		</header>
		<form id="create">
			<input id="name" placeholder="What needs to be done?" autocomplete="off" required />
			<button>Add</button>
		</form>
		<input id="search" placeholder="Search tasks…" autocomplete="off" />
		<ul id="list"></ul>
		<footer id="stats"></footer>
		<button id="break" type="button">Break something</button>
	</main>
`

const list = document.querySelector<HTMLUListElement>('#list')!
const stats = document.querySelector<HTMLElement>('#stats')!
const form = document.querySelector<HTMLFormElement>('#create')!
const name = document.querySelector<HTMLInputElement>('#name')!
const search = document.querySelector<HTMLInputElement>('#search')!

let tasks: Task[] = []
let matches: string[] | undefined

const render = () => {
	const visible = matches ? tasks.filter(task => matches!.includes(task.name)) : tasks

	list.innerHTML = ''

	for (const task of visible) {
		const item = document.createElement('li')
		const label = document.createElement('label')
		const checkbox = document.createElement('input')
		const text = document.createElement('span')

		checkbox.type = 'checkbox'
		checkbox.checked = task.done
		checkbox.addEventListener('change', async () => {
			await rpc('toggleTask', { id: task.id })
			await load()
		})

		text.textContent = task.name
		item.classList.toggle('done', task.done)
		label.append(checkbox, text)
		item.append(label)
		list.append(item)
	}
}

const load = async () => {
	const [result, created] = await Promise.all([
		rpc<{ items: Task[] }>('tasks'),

		// The stats count is a big-float value.
		rpc<{ $bigfloat: string } | null>('tasksStats'),
	])

	tasks = result.items
	stats.textContent = `${tasks.filter(task => !task.done).length} open · ${created?.$bigfloat ?? 0} created all time`
	render()
}

form.addEventListener('submit', async event => {
	event.preventDefault()

	const value = name.value.trim()

	if (!value) {
		return
	}

	name.value = ''

	await rpc('createTask', { name: value })
	await load()
})

let timer: ReturnType<typeof setTimeout> | undefined

search.addEventListener('input', () => {
	clearTimeout(timer)

	timer = setTimeout(async () => {
		const query = search.value.trim()

		if (query === '') {
			matches = undefined
			render()
			return
		}

		const result = await rpc<Task | null>('searchTasks', { query })

		matches = result ? [result.name] : []
		render()
	}, 300)
})

// The break button calls a function that always throws deep inside a
// helper - watch the on-error-log consumer's log group receive the
// error with its stack trace mapped back to the original source.
document.querySelector<HTMLButtonElement>('#break')!.addEventListener('click', async () => {
	await rpc('breakTask').catch(error => console.log('breakTask failed as intended:', error))
})

load()
