// Vite exposes the bound env on import.meta.env; other bundlers leave it
// undefined, which must not crash the whole client module.
export const getBindEnv = (name: string) => {
	const env = (import.meta as { env?: Record<string, string | undefined> }).env

	return env?.[name]
}
