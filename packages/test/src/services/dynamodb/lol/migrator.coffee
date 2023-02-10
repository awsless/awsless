
export default class Migrator

	constructor: (@db) ->

	migrate: (definitions) ->
		for definition in definitions
			await @db.createTable definition
				.promise()
