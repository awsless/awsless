import { AnyStruct, define, searchClient } from '@awsless/open-search'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName, STACK } from './util.js'

export const getSearchName = bindLocalResourceName('search')

export const getSearchProps = (name: string, stack: string = STACK) => {
	return {
		domain: process.env[`SEARCH_${constantCase(stack)}_${constantCase(name)}_DOMAIN`],
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
