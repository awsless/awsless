import { constantCase } from 'change-case'
import { STACK, bindLocalResourceName, createProxy } from './util.js'
import {
	searchClient,
	migrate as sMigrate,
	search as sSearch,
	indexItem as sIndexItem,
	updateItem as sUpdateItem,
	deleteItem as sDeleteItem,
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
			migrate(...args: Parameters<typeof sMigrate>) {
				return sMigrate(args[0], { client })
			},
			search(...args: Parameters<typeof sSearch>) {
				return sSearch(args[0], { client, ...args[1] })
			},
			indexItem(...args: Parameters<typeof sIndexItem>) {
				return sIndexItem(args[0], args[1], args[2], { client, ...args[3] })
			},
			updateItem(...args: Parameters<typeof sUpdateItem>) {
				return sUpdateItem(args[0], args[1], args[2], { client, ...args[3] })
			},
			deleteItem(...args: Parameters<typeof sDeleteItem>) {
				return sDeleteItem(args[0], args[1], { client, ...args[2] })
			},
		}
	})
})
