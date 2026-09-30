import { workos } from '@awsless/terraforge-workos'
import { Group } from '@terraforge/core'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { authOnDev } from './dev.js'

// WorkOS is a saas, so an auth pool isn't infrastructure we create - the
// environment already exists & we only declare what lives inside it.
export const formatProviderId = (id: string) => {
	return `workos-${id}`
}

export const authFeature = defineFeature({
	name: 'auth',
	onDev: authOnDev,
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const name of Object.keys(ctx.appConfig.auth)) {
			resources.addType(name, `{ readonly issuer: string, readonly clientId: string }`)
		}

		gen.addInterface('AuthResources', resources)

		await ctx.write('auth.d.ts', gen, true)
	},
	onValidate(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.auth ?? {})) {
			if (!(ctx.appConfig.configs ?? []).includes(props.apiKey)) {
				throw new Error(
					`The auth environment "${id}" reads its api key from the "${props.apiKey}" config, which isn't defined on app level.`
				)
			}

			for (const [slug, role] of Object.entries(props.roles)) {
				for (const permission of role.permissions) {
					if (!(permission in props.permissions)) {
						throw new Error(
							`The auth role "${id}.${slug}" needs the "${permission}" permission, which isn't defined.`
						)
					}
				}
			}
		}
	},
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.auth ?? {})) {
			const group = new Group(ctx.base, 'auth', id)
			const config = { provider: formatProviderId(id) }

			ctx.registerConfig(props.apiKey)

			// ------------------------------------------------------
			// Declare the permissions & the roles that carry them

			for (const [slug, name] of Object.entries(props.permissions)) {
				new workos.Permission(group, slug, { slug, name }, config)
			}

			for (const [slug, role] of Object.entries(props.roles)) {
				new workos.EnvironmentRole(
					group,
					slug,
					{
						slug,
						name: role.name,
						description: role.description,
						permissions: role.permissions,
					},
					config
				)
			}

			// ------------------------------------------------------
			// Declare where AuthKit may return users to

			for (const uri of props.redirectUris) {
				new workos.RedirectUri(group, uri, { uri }, config)
			}

			ctx.bind(`AUTH_${constantCase(id)}_ISSUER`, props.issuer)
			ctx.bind(`AUTH_${constantCase(id)}_CLIENT_ID`, props.clientId)

			ctx.shared.add('auth', 'issuer', id, props.issuer)
			ctx.shared.add('auth', 'client-id', id, props.clientId)
		}
	},
})
