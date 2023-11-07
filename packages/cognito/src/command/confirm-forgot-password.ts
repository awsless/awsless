import { Client } from '../client'

export type ConfirmForgotPasswordProps = {
	username: string
	password: string
	code: string
}

export const confirmForgotPassword = async (client: Client, props: ConfirmForgotPasswordProps) => {
	return client.call('ConfirmForgotPassword', {
		ClientId: client.id,
		Username: props.username,
		Password: props.password,
		ConfirmationCode: props.code,
	})
}
