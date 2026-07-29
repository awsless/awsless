import { basename, join } from 'path'

export type StaticRoutePlan = {
	// Exact route keys mapped to the file they serve.
	files: Record<string, string>

	// Asset dir keys like "/_app/*." that serve every dotted file below them.
	dirs: string[]

	// Sub path sites keep a single "{path}/*." catch-all.
	catchAll?: string
}

// Root sites route each top level asset dir through its own "/{dir}/*." key,
// so dotted paths outside the static output fall through to the "/*" ssr route.
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

		// sites mounted on a sub path keep the single catch-all below
		if (sitePath !== '/') {
			continue
		}

		const firstSegment = file.split('/')[0]!

		if (file.includes('/') && !firstSegment.includes('.')) {
			assetDirs.add(firstSegment)
			continue
		}

		// the route store can only key clean first segments, so root files
		// and files inside a dotted dir get their own exact route
		plan.files[join(sitePath, file)] = file
	}

	if (sitePath === '/') {
		plan.dirs = [...assetDirs].map(dir => join(sitePath, dir, '*.'))
	} else {
		plan.catchAll = join(sitePath, '*.')
	}

	return plan
}
