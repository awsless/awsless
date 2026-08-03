import { basename, dirname, join } from 'path'

export type StaticRoutePlan = {
	// Urls that map straight to one known file.
	files: Record<string, string>

	// Folders that hold only static files, served whole by one wildcard each.
	dirs: string[]

	// Sites living under a sub path serve all their files via one wildcard.
	catchAll?: string
}

// A url must be answered either with a file from storage or with a page
// rendered by the app, and we have to pick using only the url itself.
// Guessing "anything with a dot is a file" breaks pages the app renders
// under file-like urls, such as /manifest.json. Registering every single
// file would be correct but a site ships thousands of them, which would
// overflow the shared route storage after a few dozen deployments.
//
// So, following the same design as SST, we register just enough:
// each top level folder as one wildcard, each loose top level file by
// name, and every other url is assumed to be a page. The accepted cost:
// made-up file urls (like bots probing /.env) now get a rendered 404
// page instead of a cheap storage error, and a page whose url sits
// inside one of the asset folders can't be reached.
// Html files & files without an extension are served at page-like urls,
// which a file wildcard can never match, so each one needs its own url.
const isPageFile = (file: string) => {
	return file.endsWith('.html') || !basename(file).includes('.')
}

// The url a page file answers to: "about.html" answers /about &
// "blog/index.html" answers /blog.
const pageUrl = (file: string) => {
	if (!file.endsWith('.html')) {
		return file
	}

	const url = file.slice(0, -'.html'.length)

	if (basename(url) === 'index') {
		return dirname(url)
	}

	return url
}

export const planStaticRoutes = (files: string[], sitePath: string): StaticRoutePlan => {
	const plan: StaticRoutePlan = { files: {}, dirs: [] }
	const pages = files.filter(file => isPageFile(file))
	const assets = files.filter(file => !isPageFile(file))

	for (const page of pages) {
		plan.files[join(sitePath, pageUrl(page))] = page
	}

	// A site living under a sub path like /docs serves all its assets via
	// one catch-all, because the url lookup can only wildcard the first
	// path segment.
	if (sitePath !== '/') {
		plan.catchAll = join(sitePath, '*.')
		return plan
	}

	const folders = new Set<string>()

	for (const asset of assets) {
		const folder = asset.split('/')[0]!

		// Assets inside a clean top level folder share that folder's wildcard.
		if (asset.includes('/') && !folder.includes('.')) {
			folders.add(folder)
			continue
		}

		// Loose top level assets, and assets in folders with a dot in their
		// name (which the wildcard lookup can't handle), get their own url.
		plan.files[join(sitePath, asset)] = asset
	}

	plan.dirs = [...folders].map(folder => join(sitePath, folder, '*.'))

	return plan
}
