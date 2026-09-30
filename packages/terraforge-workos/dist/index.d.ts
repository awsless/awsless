import * as c from '@terraforge/core'
import * as t from '@terraforge/terraform'

// Hand written instead of generated: the build-package bin shipped with
// @terraforge/terraform imports source files the published package
// leaves out, so it can't read the provider schema. Only the resources
// the auth feature deploys are typed - the runtime proxy reaches every
// resource the provider has, typed or not.

export declare namespace workos {
	export function install(props?: t.InstallProps): Promise<void>
	export function uninstall(props?: t.InstallProps): Promise<void>
	export function isInstalled(props?: t.InstallProps): Promise<boolean>
}

export declare function workos(props: {
	/** The WorkOS API key, starting with sk_. Falls back to WORKOS_API_KEY. */
	apiKey?: string

	/** The WorkOS client id. Falls back to WORKOS_CLIENT_ID. */
	clientId?: string

	/** Defaults to https://api.workos.com. Falls back to WORKOS_BASE_URL. */
	baseUrl?: string
}, config?: { id?: string; location?: string }): c.Provider

export declare namespace workos {
	export type PermissionInput = {
		/** Unique within the environment. This is what lands in the token's permissions claim. */
		slug: c.Input<string>
		name: c.Input<string>
		description?: c.OptionalInput<string>
		resourceTypeSlug?: c.OptionalInput<string>
	}

	export class Permission {
		constructor(parent: c.Group, id: string, props: PermissionInput, config?: c.ResourceConfig)

		readonly [c.nodeMetaSymbol]: c.ResourceMeta
		readonly urn: c.URN

		readonly id: c.Output<string>
		readonly slug: c.Output<string>
		readonly name: c.Output<string>
		readonly description: c.OptionalOutput<string>
		readonly system: c.Output<boolean>
		readonly createdAt: c.Output<string>
		readonly updatedAt: c.Output<string>
	}

	export type EnvironmentRoleInput = {
		slug: c.Input<string>
		name: c.Input<string>
		description?: c.OptionalInput<string>

		/** The complete set of permission slugs on the role. */
		permissions?: c.OptionalInput<c.Input<string>[]>
		resourceTypeSlug?: c.OptionalInput<string>
	}

	export class EnvironmentRole {
		constructor(parent: c.Group, id: string, props: EnvironmentRoleInput, config?: c.ResourceConfig)

		readonly [c.nodeMetaSymbol]: c.ResourceMeta
		readonly urn: c.URN

		readonly id: c.Output<string>
		readonly slug: c.Output<string>
		readonly name: c.Output<string>
		readonly description: c.OptionalOutput<string>
		readonly type: c.Output<string>
		readonly createdAt: c.Output<string>
		readonly updatedAt: c.Output<string>
	}

	export type RedirectUriInput = {
		/** An https callback on the AuthKit application behind the api key. */
		uri: c.Input<string>
	}

	export class RedirectUri {
		constructor(parent: c.Group, id: string, props: RedirectUriInput, config?: c.ResourceConfig)

		readonly [c.nodeMetaSymbol]: c.ResourceMeta
		readonly urn: c.URN

		readonly id: c.Output<string>
		readonly uri: c.Output<string>
		readonly default: c.Output<boolean>
		readonly createdAt: c.Output<string>
		readonly updatedAt: c.Output<string>
	}
}
