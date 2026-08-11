const env = await Bun.file('.awsless/local/env.json').json()
Object.assign(process.env, env)
const { Email } = await import('awsless')
await Email.send({
	from: 'noreply@jacksclub.dev',
	to: ['ivan@jacksclub.dev'],
	subject: 'Welcome to the local outbox',
	html: '<h1>Hello!</h1><p>This email was captured by the <b>awsless dev</b> ses shim.</p>',
})
await Email.send({
	from: 'noreply@jacksclub.dev',
	to: ['support@jacksclub.dev', 'ivan@jacksclub.dev'],
	subject: 'A second email',
	html: '<p>With multiple recipients.</p>',
})
console.log('sent')
