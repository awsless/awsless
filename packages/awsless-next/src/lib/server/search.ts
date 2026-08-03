import { AnySchema, define, searchClient } from '@awsless/open-search'
import { kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { APP, getStack, IS_LOCAL, IS_TEST } from './util.js'

// The physical name of a search index inside the shared domain: the
// index name prefixed with its stack. Must stay in sync with
// formatSearchIndexName in the cli search feature. Tests add the
// per-file app prefix, since every test file shares one run-wide
// search server.
export const getSearchProps = (name: string, stack: string = getStack()) => {
	return {
		domain: process.env.SEARCH_DOMAIN,
		name: IS_TEST ? `${kebabCase(APP)}--${kebabCase(stack)}--${name}` : `${kebabCase(stack)}--${name}`,
	} as const
}

export interface SearchResources {}

export const Search: SearchResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const { domain, name: index } = getSearchProps(name, stack)
		let client: any

		return {
			name: index,
			domain,
			define(schema: AnySchema) {
				return define(index, schema, () => {
					// The local dev & test search servers run without tls.
					if (!client) {
						client = searchClient({ node: `${IS_LOCAL || IS_TEST ? 'http' : 'https'}://${domain}` }, 'es')
					}
					return client
				})
			},
		}
	})
})
