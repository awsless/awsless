import { Asset, ResolvedAsset } from '../asset'
import { ResourceDocument } from '../cloud'
import { Input, unwrap } from '../output'

export const loadAssets = async (assets: Record<string, Input<Asset>>) => {
	const resolved: Record<string, ResolvedAsset> = {}
	const hashes: Record<string, string> = {}

	await Promise.all(
		Object.entries(assets).map(async ([name, asset]) => {
			const data = await unwrap(asset).load()
			const buff = await crypto.subtle.digest('SHA-256', data)
			const hash = Buffer.from(buff).toString('hex')

			hashes[name] = hash
			resolved[name] = {
				data,
				hash,
			}
		})
	)

	return [resolved, hashes] as const
}

export const resolveDocumentAssets = (document: any, assets: Record<string, ResolvedAsset>): ResourceDocument => {
	if (document !== null && typeof document === 'object') {
		for (const [key, value] of Object.entries(document)) {
			if (
				value !== null &&
				typeof value === 'object' &&
				'__ASSET__' in value &&
				typeof value.__ASSET__ === 'string'
			) {
				document[key] = assets[value.__ASSET__]?.data.toString('utf8')
			} else {
				resolveDocumentAssets(value, assets)
			}
		}
	} else if (Array.isArray(document)) {
		for (const value of document) {
			resolveDocumentAssets(value, assets)
		}
	}

	return document
}
