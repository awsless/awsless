// The auth lambda name if defined.
export const AUTH = process.env.AUTH

// List of query methods that map to the corresponding lambda name.
export const SCHEMA: Record<string, string> = JSON.parse(process.env.SCHEMA ?? '{}')
