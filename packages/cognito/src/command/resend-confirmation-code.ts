import { Client } from '../client'

export type ResendConfirmationCodeProps = {
	username: string
}

export const resendConfirmationCode = async (client: Client, props: ResendConfirmationCodeProps) => {
	return client.call('ResendConfirmationCode', {
		ClientId: client.id,
		Username: props.username,
	})
}
