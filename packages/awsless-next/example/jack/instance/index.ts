import { createServer } from 'node:http'

console.log('version 1')
console.log('Starting instance...')

const PORT = process.env.PORT || 80

const server = createServer((_, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain' })
	res.end('hello world')
})

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
