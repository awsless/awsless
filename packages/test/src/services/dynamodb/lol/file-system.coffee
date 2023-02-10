
import fs	from 'fs'
import util	from 'util'

export default class FileSystem

	exists: util.promisify fs.exists
	open:	util.promisify fs.open
	close:	util.promisify fs.close
	unlink:	util.promisify fs.unlink

	ensure: (file) ->
		if await @exists file
			return

		handle = await @open file, 'w'
		await @close handle

	remove: (file) ->
		if not await @exists file
			return

		await @unlink file
