import { Client } from '../client'

export type ConfirmSignUpProps = {
	username: string
	code: string
	forceAliasCreation?: boolean
}

export const confirmSignUp = async (client: Client, props: ConfirmSignUpProps) => {
	return client.call('ConfirmSignUp', {
		ClientId: client.id,
		Username: props.username,
		ConfirmationCode: props.code,
		ForceAliasCreation: props.forceAliasCreation,
	})
}
