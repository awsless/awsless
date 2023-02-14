
export default class Seeder

	constructor: (@db, @data = {}) ->

	seed: ->
		for TableName, Items of @data
			for Item in Items
				await @db.put {
					TableName
					Item
				}
				.promise()
