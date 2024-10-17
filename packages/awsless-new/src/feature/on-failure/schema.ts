import { FunctionSchema } from '../function/schema.js'

/** Defining a onFailure handler will add a global onFailure handler for the following resources:
 * - Async lambda functions
 * - SQS queues
 * - DynamoDB streams
 * @example
 * {
 *   onFailure: 'on-failure.ts'
 * }
 */

export const OnFailureSchema = FunctionSchema.optional().describe(
	'Defining a onFailure handler will add a global onFailure handler for the following resources:\n- Async lambda functions\n- SQS queues\n- DynamoDB streams'
)
