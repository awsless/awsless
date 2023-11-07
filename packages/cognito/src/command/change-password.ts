import { Client } from '../client.js'
import { getSession } from './get-session.js'

export type ChangePasswordProps = {
	previousPassword: string
	proposedPassword: string
}

export const changePassword = async (client: Client, props: ChangePasswordProps) => {
	const session = await getSession(client)

	return client.call('ChangePassword', {
		PreviousPassword: props.previousPassword,
		ProposedPassword: props.proposedPassword,
		AccessToken: session.accessToken.toString(),
	})
}
