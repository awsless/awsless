<script>
	import { lang } from './svelte-5.svelte'

	let { tree, children, ...nodes } = $props()

	const list = $derived(tree?.[lang.locale] ?? tree?.src)
</script>

<!-- Kept on one line so the renderer adds no whitespace of its own -->
{#snippet render(list)}{#each list as node}{#if typeof node === 'string'}{node}{:else}{#snippet sub()}{@render render(node[1] ?? [])}{/snippet}{@render nodes['n' + node[0]](sub)}{/if}{/each}{/snippet}{#if list}{@render render(list)}{:else}{@render children?.()}{/if}
