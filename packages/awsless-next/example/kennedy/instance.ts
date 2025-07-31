console.log('Starting instance...')
import { createServer } from 'node:http'

const PORT = process.env.PORT || 80

const server = createServer((req, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain' })
	res.end('hello world')
})

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
