```ts

// await updateItem({
// 	update: e => [
// 		e.comments.at(0).message.set('').
// 		e.profile.age.set(1),
// 		e.profile.age.incr(e.userId),
// 	],
// 	when: e => e.slug.exists(),
// })

await query(posts)
	.index('list')
	.where({ userId: 1 })
	.order('asc')
	.limit(10)



// await updateItem(posts, { userId: 1 })
// 	.update(e => [
// 		e.comments.at(0).message.set('').
// 		e.profile.age.set(1),
// 		e.profile.age.incr(e.userId),
// 	])
// 	.limit(10)



await query(posts, { userId: 1 }, {
	index: 'list',
	order: 'asc',
	limit: 10,
})

await query(posts, { userId: 1 }, {
	index: 'list',
	order: 'asc',
	limit: 10,
	where: {
		id: { $gt: 1 }
	}
})

for await(const items of query(posts, { userId: 1 }, {
	limit: 10
})) {
	...
}

await scan(posts, {
	order: 'desc',
	limit: 10,
})

for await(const items of scan(posts)) {
	...
}

await transactRead([
	getItem(posts, { userId: 1, id: 1 }),
	getItem(posts, { userId: 1, id: 1 }),
	getItem(posts, { userId: 1, id: 1 }),
])

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
		when: e => [
			e.userId.exists(),
		]
	})
])

await deleteItems(posts, [
	{ userId: 1, id: 1 },
	{ userId: 1, id: 1 },
	{ userId: 1, id: 1 }
])

await getItems(posts, [
	{ userId: 1, id: 1 },
	{ userId: 1, id: 1 },
	{ userId: 1, id: 1 }
])

await putItems(posts, [
	{ userId: 1, id: 1 },
	{ userId: 1, id: 1 },
	{ userId: 1, id: 1 }
])

```

# Issues

- $setPartial doesn't work for Record
- $push should not be allowed for Tuple
- the $eq comparitor isn't working well for Record.

```ts
updateItem({
	update: e => [
		e.userId.set(1),
		e.profile.delete(),
		// Set a property to an other property.
		e.id.set(e.userId),
	],
	when: e =>
		e.or([
			//
			e.not(e.id.exists()),
			e.userId.eq(1),
			e.profile(1).age.eq(1),
		]),
})
```

```ts
// Awsless v3
updateItem({
	update: (p, f) => [
		//
		f.set(p.userId, 1),
		f.delete(p.profile),
		f.set(p.id, p.userId),
	],
	when: (p, f) =>
		f.or([
			//
			f.not(f.exists(p.id)),
			f.eq(p.userId, 1),
			f.eq(p.profile.age, 2),
		]),
})
```

```ts

await updateItem({
	update: e => [
		// e.set({
		// 	id:
		// }),
		// e.comments.set([]),
		// e('comments', 1, 'message').set(''),

		// e.comments['hello'].message.set('').

		e.profile.age.set(1),
		e.profile.age.incr(e.userId),
	],
	when: e => e.and([
		e.slug.gt(1),
		e.or([
			e.slug.exists()),
			e.slug.exists()
		]),
	])
})

```
