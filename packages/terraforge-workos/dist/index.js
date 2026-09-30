import { createTerraformProxy } from '@terraforge/terraform'

// The proxy snake cases the property path into the terraform resource
// type, so workos.Permission resolves to workos_permission.
export const workos = createTerraformProxy({
	namespace: 'workos',
	provider: { org: 'osodevops', type: 'workos', version: '2.5.0' },
})
