
import { combine, generator } from '../helper/expression.js'
import { updateItem } from '../operations/update-item.js'
import { ql } from '../ql.js'
import { Table } from '../table.js'
import { and, eq } from './conditions.js'
import { name, value } from './node.js'
// import { ql } from '../ql.js'
// import { Expression } from '../types.js'

// export const updateExpression = (callback:): Expression => {
// 	return {

// 	}
// }

// const update = updateExpression()
// update.set(key(''))
// update.add(key(''))


type Post = {
	id: string
	userId: string
	title: string
	array: {
		item: string
	}[]
}

const table = new Table<Post, 'id'>('lol')

// table.paths[1] === ['dsad', 'sadas']
const gen = generator()

// and(
// 	eq(name('userId'), value(1)),
// 	eq(name('id'), value(3))
// )(gen)

const n1 = name('userId')(gen, table)
const n2 = name('userIds')(gen, table)

n1.type

n2.type

and(
	eq(name('userId'), value(1)),
	eq(name('userId'), value(1))
)

updateItem(table, { id: '1' }, {
	update: ql`#userId = ${'1'} AND #id = ${3}`,
	// update: set({ 'userId': 1 }),
	// update: update(
	// 	set(name('title'), value(1)),
	// 	set(name('id'), value(3))
	// ),

	// condition(query) {
	// 	query.eq('userId', 1)
	// }

	condition: and(
		eq(name('userIds'), value(1)),
		eq(name('id'), value(3))
	)

	// ql`#userId = ${'1'} AND #${('id')} = ${3}`,
	// condition: and(
	// 	eq(key('lol'), value('1')),
	// 	eq(key('id'), value('3'))
	// )
})

// set(key('lol'), add(key('lol'), 1))
// const expression = value('lol1')(gen)
// expression.values

const path = name('foo', 'bar')

// const com = combine(path, '=', name('other'))(gen).paths[0][0] === 'foo'

// path(gen).paths
const expression = eq(name('foo', 'bar'), value('hello'))(gen, table)
// const paths = expression.paths[0][0]
const names = expression.names['lol'] === 'bars'
const values = expression.values['d'] === 'hello'
