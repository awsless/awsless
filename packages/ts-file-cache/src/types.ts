export type PackageDependency = {
	type: 'package'
	version: string
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
	dependencies: Record<string, Dependency>
}

export type Workspace = {
	cwd: string
	packages: Record<string, Package>
}
