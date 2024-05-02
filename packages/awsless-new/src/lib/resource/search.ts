import { constantCase } from 'change-case'
import { STACK, bindLocalResourceName, createProxy } from './util.js'
import {
	searchClient,
	migrate as _migrate,
	search as _search,
	indexItem as _indexItem,
	updateItem as _updateItem,
	deleteItem as _deleteItem,
} from '@awsless/open-search'

export const getSearchName = bindLocalResourceName('search')

export const getSearchProps = (name: string, stack: string = STACK) => {
	return {
		domain: process.env[`CACHE_${constantCase(stack)}_${constantCase(name)}_DOMAIN`],
	} as const
}

export interface SearchResources {}

export const Search: SearchResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const { domain } = getSearchProps(name, stack)
		const client = searchClient({ node: domain })

		return {
			name: getSearchName(name, stack),
			domain,
			migrate(...args: Parameters<typeof _migrate>) {
				return _migrate(args[0], { client })
			},
			search(...args: Parameters<typeof _search>) {
				return _search(args[0], { client, ...args[1] })
			},
			indexItem(...args: Parameters<typeof _indexItem>) {
				return _indexItem(args[0], args[1], args[2], { client, ...args[3] })
			},
			updateItem(...args: Parameters<typeof _updateItem>) {
				return _updateItem(args[0], args[1], args[2], { client, ...args[3] })
			},
			deleteItem(...args: Parameters<typeof _deleteItem>) {
				return _deleteItem(args[0], args[1], { client, ...args[2] })
			},
		}
	})
})
