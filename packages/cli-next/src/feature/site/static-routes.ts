import { basename, join } from 'path'

export type StaticRoutePlan = {
	// Exact route keys mapped to the file they serve.
	files: Record<string, string>

	// Asset dir keys like "/_app/*." that serve every dotted file below them.
	dirs: string[]

	// Sub path sites keep a single "{path}/*." catch-all.
	catchAll?: string
}

// The scheme mirrors the SST v3 router: exact route store keys for top level
// files, one "/{dir}/*." key per top level asset dir, and any other dotted
// path falls through to the "/*" ssr route. A single "/*." catch-all would
// shadow dotted ssr routes like /manifest.json with s3 errors, while per-file
// keys for the whole site would fill the 5MB route store within ~25 deploys.
// The cost of the fallthrough: junk dotted paths (/.env probes) render an ssr
// 404 instead of dying cheaply at s3, and a dotted ssr route below an asset
// dir stays shadowed. SST accepts the same tradeoffs & mitigates via the waf.
export const planStaticRoutes = (files: string[], sitePath: string): StaticRoutePlan => {
	const plan: StaticRoutePlan = { files: {}, dirs: [] }
	const assetDirs = new Set<string>()

	for (const file of files) {
		if (file.endsWith('.html')) {
			const strippedHtmlFile = file.endsWith('index.html') ? file.slice(0, -11) : file.slice(0, -5)

			const urlFriendlyFile = strippedHtmlFile.endsWith('/')
				? strippedHtmlFile.slice(0, -1)
				: strippedHtmlFile

			plan.files[join(sitePath, urlFriendlyFile)] = file
			continue
		}

		if (!basename(file).includes('.')) {
			plan.files[join(sitePath, file)] = file
			continue
		}

		// The viewer function only probes the "/{first-segment}/*." key, so a
		// site mounted on a sub path can't key per asset dir & keeps the
		// single "{path}/*." catch-all below.
		if (sitePath !== '/') {
			continue
		}

		const firstSegment = file.split('/')[0]!

		if (file.includes('/') && !firstSegment.includes('.')) {
			assetDirs.add(firstSegment)
			continue
		}

		// Root files and files inside a dotted dir get their own exact route,
		// since the route store can only key dot-free first segments.
		plan.files[join(sitePath, file)] = file
	}

	if (sitePath === '/') {
		plan.dirs = [...assetDirs].map(dir => join(sitePath, dir, '*.'))
	} else {
		plan.catchAll = join(sitePath, '*.')
	}

	return plan
}
