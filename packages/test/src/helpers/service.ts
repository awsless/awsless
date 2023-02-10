
export const serviceName = (service:string|undefined, name:string) => {
	return service ? `${ service }__${ name }` : name
}
