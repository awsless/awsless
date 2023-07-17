import { Architecture as CdkArchitecture } from 'aws-cdk-lib/aws-lambda'

export type Architecture = Lowercase<keyof Pick<typeof CdkArchitecture, 'ARM_64' | 'X86_64'>>

export const toArchitecture = (architecture:Architecture) => {
	return architecture === 'x86_64' ? CdkArchitecture.X86_64 : CdkArchitecture.ARM_64
}
