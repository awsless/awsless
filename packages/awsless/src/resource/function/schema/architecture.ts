import { Architecture as CdkArchitecture } from 'aws-cdk-lib/aws-lambda'
import { z } from 'zod'

export type Architecture = Lowercase<keyof Pick<typeof CdkArchitecture, 'ARM_64' | 'X86_64'>>

export const toArchitecture = (architecture:Architecture) => {
	return architecture === 'x86_64'
		? CdkArchitecture.X86_64
		: CdkArchitecture.ARM_64
}

export const ArchitectureSchema = z.enum([ 'x86_64', 'arm_64' ]).transform(toArchitecture)
