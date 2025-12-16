import { LambdaClient, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda'
import { createCustomProvider, createCustomResourceClass, Input, OptionalInput, Output } from '@awsless/formation'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials } from '../util/aws'

type UpdateFunctionCodeInput = {
	version?: OptionalInput<string>
	architectures: Input<Input<string>[]>
	functionName: Input<string>
} & (
	| {
			s3Bucket: OptionalInput<string>
			s3Key: OptionalInput<string>
			s3ObjectVersion?: OptionalInput<string>
	  }
	| {
			imageUri: OptionalInput<string>
	  }
)

type UpdateFunctionCodeOutput = {
	id: Output<string>
}

export const UpdateFunctionCode = createCustomResourceClass<UpdateFunctionCodeInput, UpdateFunctionCodeOutput>(
	'lambda',
	'update-function-code'
)

type ProviderProps = {
	credentials: Credentials
	region: Region
}

export const createLambdaProvider = ({ credentials, region }: ProviderProps) => {
	const lambda = new LambdaClient({ credentials, region })

	return createCustomProvider('lambda', {
		'update-function-code': {
			async updateResource(props) {
				const state = z
					.object({
						functionName: z.string(),
						architectures: z.string().array(),
						s3Bucket: z
							.string()
							.optional()
							.transform(v => (v ? v : undefined)),
						s3Key: z
							.string()
							.optional()
							.transform(v => (v ? v : undefined)),
						s3ObjectVersion: z
							.string()
							.optional()
							.transform(v => (v ? v : undefined)),
						imageUri: z
							.string()
							.optional()
							.transform(v => (v ? v : undefined)),
					})
					.parse(props.proposedState)

				await lambda.send(
					new UpdateFunctionCodeCommand({
						FunctionName: state.functionName,
						Architectures: state.architectures,
						ImageUri: state.imageUri,
						S3Bucket: state.s3Bucket,
						S3Key: state.s3Key,
						S3ObjectVersion: state.s3ObjectVersion,
					})
				)

				return state
			},
		},
	})
}
