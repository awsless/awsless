import { color, log } from '../src/index'

const longword = Array.from({ length: 20 })
	.map(() => 'longtext')
	.join('')

const longtext = Array.from({ length: 20 })
	.map(() => 'long text')
	.join(' ')

const jsontext = JSON.stringify(
	{
		payload: {
			echo: 'HELLO',
		},
	},
	undefined,
	2
)

log.intro('intro')
log.note('message', 'Note!')
log.info('info')
log.step('step')
log.message('message')
log.warning('warning')
log.success('success')
log.error('error')

await log.task({
	initialMessage: 'Loading Task...',
	successMessage: 'Task Done',
	async task() {
		await new Promise(resolve => setTimeout(resolve, 1000))
	},
})

try {
	// await log.task('Loading Task...', async update => {
	// 	throw new Error('Failed Task')
	// })
	await log.task({
		initialMessage: 'Loading Task...',
		errorMessage: 'Failed Task',
		async task() {
			throw new Error('Oops, something went wrong!')
		},
	})
} catch (error) {
	if (error instanceof Error) {
		log.error(error.message)
	}
}

log.list('List', {
	Label: 'value',
	'Longer Label': 'value',
})

log.table({
	head: ['user', 'active', 'logins'],
	body: [
		['Jack', true, 124],
		['Yenny', false, 0],
	],
})

log.message(longtext)
log.message(longword)
log.message(jsontext)

log.note('Note!', longword)
log.note(longword, 'Note!')
log.note(longword, longword)

log.table({
	head: ['User', 'Active', color.blue('Logins')],
	body: [
		[longword, longword, color.blue(longword)],
		[jsontext, longtext],
	],
})

log.table({
	head: ['User', 'Active', color.blue('Logins')],
	body: [
		['jack', true, longtext],
		['jack', true, longtext],
		['jack', true, longword],
	],
})

log.table({
	head: ['Type', 'Resource', 'Size', 'Build Time', 'Cached'],
	body: [
		['function', 'app-jack-next--stack--function--echo', '12.26kB', '222ms', 'yes'],
		['function', 'app-jack-next--stack--function--echo', '12.26kB', '222ms', 'yes'],
	],
})

await log.task({
	initialMessage: longword,
	async task() {},
})

log.outro('outro')

log.intro(color.blue(longword))
log.outro(longword)

process.exit()
