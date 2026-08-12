import { z } from 'zod'

export const ArchitectureSchema = z
	.enum(['x86_64', 'arm64'])
	.describe('The instruction set architecture that the function supports.')

export const NodeRuntimeSchema = z
	.enum(['nodejs18.x', 'nodejs20.x', 'nodejs22.x'])
	.describe("The identifier of the function's runtime.")
