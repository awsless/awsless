import { createServer } from 'http'

const PORT = process.env.PORT || 443

const server = createServer((req, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain' })
	res.end('hello world')
})

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
