import { constantCase } from 'change-case'
import { STACK, bindLocalResourceName, createProxy } from './util.js'
import { searchClient, define, AnyStruct } from '@awsless/open-search'

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
		let client: any
		return {
			domain,
			defineTable(tableName: string, schema: AnyStruct) {
				return define(tableName, schema, () => {
					if (!client) client = searchClient({ node: domain }, 'es')
					return client
				})
			},
		}
	})
})
