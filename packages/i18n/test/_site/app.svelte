<script lang="ts">
	import { t } from '../../src/framework/svelte'
	import { content } from './lib/content'
	import Head from './head.svelte'
	// import

	let num = 1
	let title = $t`Title`
</script>

<Head />

<h1>{title}</h1>
<h2>{content}</h2>
<div>{ $t`test` }</div>
<div>{ $t`the count is ${num}` }</div>
<div>{ $t`the number is ${1}` }</div>
<div>{ $t`Loading...` }</div>
