
# @awsless/clui

The @awsless/clui package combines a couple of useful npm packages to create easy to use & beautiful terminal applications.

Special thanks to:
- @clack/prompts
- cli-table3
- chalk

## Setup

Install with (NPM):

```
npm i @awsless/clui
```

## Basic Usage

```ts
import { log, prompt, color } from '@awsless/clui';

log.intro(color.blue.bold('Create a blog post'))

const title = await prompt.text({ message: 'Title:' })
const message = await prompt.text({ message: 'Message:' })

log.list('Preview post', {
	title,
	message,
})

const ok = await prompt.confirm({ message: 'Are you sure?' })

if(!ok) {
	log.error('Canceled')
	return
}

await log.task({
	initialMessage: 'Creating post...',
	successMessage: 'You blog post was successfully created!',
	async task() {
		// Create your blog post
	}
})

log.outro('The end!')

```

## Supported Prompts

- prompt.text
- prompt.password
- prompt.integer
- prompt.float
- prompt.confirm
- prompt.select
- prompt.multiSelect

## Supported Logs

- log.intro
- log.outro
- log.note
- log.message
- log.step
- log.info
- log.warning
- log.error
- log.success
- log.list
- log.table
- log.task

## Supported Ansi Helpers:

- ansi.wrap
- ansi.length
- ansi.truncate
- ansi.pad

## License

MIT
