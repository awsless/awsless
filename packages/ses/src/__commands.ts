// import { SendEmailCommand } from '@aws-sdk/client-sesv2'
// import { sesClient } from './client'

// export const send = async ({ client = sesClient() }) => {
// 	const command = new new SendEmailCommand({
// 		FromEmailAddress: formatAddress(sender.name, sender.email),
// 		Destination: {
// 			ToAddresses: [formatAddress(user.name, user.email)],
// 		},
// 		Content: {
// 			Simple: {
// 				Subject: {
// 					Data: subject,
// 					Charset: 'UTF-8',
// 				},

// 				Body: {
// 					Html: {
// 						Data: html,
// 						Charset: 'UTF-8',
// 					},
// 					...formatTextBody(),
// 				},
// 			},
// 		},
// 	})()

// 	await client.send(command)
// }
