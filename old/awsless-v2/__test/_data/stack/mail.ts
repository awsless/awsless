import { StackConfig } from '../../../old/index.js'

export const mailStack: StackConfig = {
	name: 'mail',
	functions: {
		send: __dirname + '/send-mail.ts',
	},
	// mail: {
	// 	mailer: {
	// 		domain: 'example.com',
	// 		triggers: {
	// 			complaint: 'info@example.com',
	// 		},
	// 	},
	// },
}
