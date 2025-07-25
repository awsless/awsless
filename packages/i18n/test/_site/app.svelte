<script>
	import { lang } from '../../src/framework/svelte.svelte'
	import { content } from './lib/content'
	import Head from './head.svelte'
	// import

	let num = 1
	let title = lang.t`Title`
</script>

<Head />

<h1>{title}</h1>
<h2>{content}</h2>
<div>{ lang.t`test` }</div>
<div>{ lang.t`the count is ${num}` }</div>
<div>{ lang.t`the number is ${1}` }</div>
<div>{ lang.t`Loading...` }</div>
