
import net			from 'net'
import lockfile		from 'proper-lockfile'

export default class PortFinder

	constructor: (@fs, @min = 32768, @max = 65535, @timeout = 1000 * 60 * 5) ->

	random: ->
		return Math.floor Math.random() * (@max - @min) + @min

	check: (port) ->
		return new Promise (resolve, reject) ->
			server = net.createServer()
			server.once 'error', (error) ->
				if error.code is 'EADDRINUSE'
					resolve false
				else
					reject error

			server.once 'listening', ->
				server.close()
				resolve true

			server.listen port

	fileName: (port) ->
		return "/var/tmp/port-#{ port }"

	lock: (port) ->
		file = @fileName port
		await @fs.ensure file

		try
			await lockfile.lock file, {
				stale:		@timeout
				retries:	0
			}
		catch error
			return false

		@port = port
		return true

	release: ->
		if @port
			file = @fileName @port
			await lockfile.unlock file
			await @fs.remove file
			@port = null

	find: ->
		times = 10
		while times--
			port = @random()
			open = await @check port
			if not open
				continue

			if await @lock port
				return port

		throw new Error 'No port found'
