import { Config, Fn } from 'awsless'
import { Todo } from '../todo/table'

const escapeHtml = (value: string) => {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const renderTodo = (todo: Todo) => `
	<li>
		<label>
			<input type="checkbox" data-toggle="${todo.id}" ${todo.done ? 'checked' : ''} />
			${todo.done ? `<s>${escapeHtml(todo.title)}</s>` : escapeHtml(todo.title)}
		</label>
		<button data-remove="${todo.id}">x</button>
	</li>
`

const renderPage = (greeting: string, todos: Todo[]) => `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>Todos</title>
	</head>
	<body>
		<h1>${escapeHtml(greeting)}</h1>
		<form>
			<input name="title" placeholder="What needs to be done?" autofocus />
			<button>Add</button>
		</form>
		<ul>
			${todos.map(renderTodo).join('')}
		</ul>
		<script>
			const rpc = async (name, payload) => {
				const body = JSON.stringify([{ name, payload }])

				// CloudFront only signs the request for the IAM protected
				// lambda url origin when the viewer sends the body hash.
				const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
				const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')

				const response = await fetch('/api', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						'x-amz-content-sha256': hash,
					},
					body,
				})
				const [result] = await response.json()

				if (!result.ok) {
					throw new Error(result.error.message)
				}

				return result.data
			}

			document.querySelector('form').addEventListener('submit', async event => {
				event.preventDefault()
				const title = event.target.title.value.trim()

				if (title) {
					await rpc('addTodo', { title })
					location.reload()
				}
			})

			document.querySelector('ul').addEventListener('click', async event => {
				const { toggle, remove } = event.target.dataset

				if (toggle) {
					await rpc('toggleTodo', { id: toggle })
					location.reload()
				}

				if (remove) {
					await rpc('removeTodo', { id: remove })
					location.reload()
				}
			})
		</script>
	</body>
</html>
`

export default async () => {
	const todos = await Fn.stack.list()

	return {
		statusCode: 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
		},
		body: renderPage(Config.GREETING, todos),
	}
}
