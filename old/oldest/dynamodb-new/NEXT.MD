```ts

const posts = define('posts', {
	hash: 'userId',
	sort: 'id',
	schema: object({
		id: number(),
		userId: number(),
		title: string(),
		comments: array({
			message: string()
		})
	})
})

await getItem(posts, {
	userId: 1,
	id: 1,
},{
	consistentRead: true,
	projection: ['title'],
})

await setItem(posts, {
	userId: 1,
	id: 1,
	title: 'My post'
})

await deleteItem(posts, {
	userId: 1,
	id: 1,
})

await updateItem(posts, {
	userId: 1,
	id: 1,
},{
	update: {
		$set: {
			userId: 1
		},
		userId: { $set: 1 },
		id: { $incr: 1 },
		title: { $setIfNotExists: 'My new post' },
		comments: {
			0: {
				message: { $set: "hello" }
			}
		}
	},
	condition: {
		$or: [
			{ userId: { $exists: true } },
			{ id: { $eq: 1 } },
			{ title: { $startsWith: 'My' } },
			{ id: { $includes: [1, 2, 3] } }
		]
	}
})

await query(posts, { userId: 1 }, {
	index: 'list',
	order: 'asc',
	limit: 10,
	where: {
		id: { $gt: 1 }
	}
})

await scan(posts, {
	order: 'desc',
	limit: 10,
})

for await(const items of scan(posts)) {
	...
}

await transactWrite([
	setItem(posts, {
		userId: 1,
		id: 1,
		title: 'My post'
	}),
	conditionCheck(posts, {
		userId: 1,
		id: 2,
	},{
		userId: { $exists: true, },
	})
])

await batchWrite([
	setItem(posts, {
		userId: 1,
		id: 1,
		title: 'My post'
	}),
	deleteItem(posts, {
		userId: 1,
		id: 1,
	}),
])

await batchRead([
	getItem(posts, {
		userId: 1,
		id: 1,
	}),
])

```
