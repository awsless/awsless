export type PackageDependency = {
	type: 'package'
	version: string

	// One hash pinning the dependency's whole resolved subtree, so
	// transitive updates bust the cache without involving the parts of
	// the lockfile this dependency can't reach. Package managers
	// without a resolved graph fall back to the whole lockfile hash.
	treeHash: string
}

export type WorkspaceDependency = {
	type: 'workspace'
	link: string
}

export type Dependency = PackageDependency | WorkspaceDependency

export type Package = {
	path: string
	name: string
	main?: string
	// The package.json exports by subpath (".", "./bundle"), as files. A
	// pattern ("./features/*") keeps its "*" on both sides.
	exports: Record<string, string>
	// Without an exports map, any file of the package can be imported.
	hasExports: boolean
	dependencies: Record<string, Dependency>
}

export type Workspace = {
	cwd: string
	packages: Record<string, Package>
	lockfileHash: string
}
