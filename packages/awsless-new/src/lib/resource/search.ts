import { constantCase } from 'change-case'
import { STACK, bindLocalResourceName, createProxy } from './util.js'
import { searchClient, migrate, search, indexItem, updateItem, deleteItem } from '@awsless/open-search'

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
			migrate(...args: Parameters<typeof migrate>) {
				return migrate(args[0], { client })
			},
			search(...args: Parameters<typeof search>) {
				return search(args[0], { client, ...args[1] })
			},
			indexItem(...args: Parameters<typeof indexItem>) {
				return indexItem(args[0], args[1], args[2], { client, ...args[3] })
			},
			updateItem(...args: Parameters<typeof updateItem>) {
				return updateItem(args[0], args[1], args[2], { client, ...args[3] })
			},
			deleteItem(...args: Parameters<typeof deleteItem>) {
				return deleteItem(args[0], args[1], { client, ...args[2] })
			},
		}
	})
})
