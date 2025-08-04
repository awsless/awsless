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
	select: {
		title: true,
		comments: {
			0: {
				message: true
			}
		}
	}
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
		// $setPartial: { userId: 1 },
		userId: { $set: 1 },
		id: { $incr: 1 },
		title: { $setIfNotExists: 'My new post' },
		comments: {
			[0]: {
				message: { $set: "hello" }
			}
		},
	},
	when: {
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
			e.userId.$exists(),
		]
		// when: {
		// 	userId: { $exists: true, },
		// }
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



## Proposal 2

```ts

// DIT IS WEL OK
const updateExpression = {
	userId: {
		$set: untrusted
	}
}

// DIT NIET
const updateExpression = {
	userId: untrusted
}

```

```ts

const updateExpression = {
	userId: $set(1),
	id: $set(1),
	title: $setIfNotExists('My new post'),
	comments: {
		0: {
			message: $set(''),
		}
	}
}

```

```ts

updateItem({
	update: [
		{ $set: ['userId', 1] },
	],
	when: {
		$and: [
			{ $eq: ['userId', 1] },
			{ $eq: [ ['profile', 'age' ], 1] }
		]
	}
})

```

```ts
updateItem({
	update: f => f.set('userId', 1),
	when: f => f.and([
		f.eq('userId', 1),
		f.eq(['profile', 'age'], 1)
	])
})
```

```ts
updateItem({
	update: $ => [
		$('userId').set(1),
		$('profile').delete(),
		// Set a property to an other property.
		$('id').set($('userId')),
	],
	when: $ => $.or([
		$.not($('id').exists()),
		$('userId').eq(1),
		$('profile', 'age').eq(1),
	])
})
```

```ts
updateItem({
	update: e => [
		e.userId.$set(1),
		e.profile.$delete(),
		// Set a property to an other property.
		e.id.$set(e.userId),
	],
	when: e => e.$or([
		e.$not(e.id.$exists()),
		e.userId.$eq(1),
		e.profile.age.$eq(1),
	])
})
```

```ts
updateItem({
	update: e => [
		e.userId.set(1),
		e.profile.delete(),
		// Set a property to an other property.
		e.id.set(e.userId),
	],
	when: e => e.or([
		e.not(e.id.exists()),
		e.userId.eq(1),
		e.profile(1).age.eq(1),
	])
})
```

```ts
updateItem({
	update: {
		userId: { $set: 1 },
	},
	when: {
		$or: {
			userId: { $eq: 1 },
			profile: { age: { $eq: 1 } }
		}
	}
})
```



```ts
const untrustedUserId = { $incr: 1 }
const expectedUserId = 1

updateItem({
	update: {
		userId: untrustedUserId
	},
	when: {
		$or: {
			userId: { $eq: 1 },
			'profile.age': { $eq: 1 }
		}
	}
})
```



```ts
updateItem({
	select: (s) => [
		s.userId
	],
	update: (p, f) => [
		f.set(p.userId, 1),
		f.delete(p.profile),
		// Set a property to an other property.
		f.set(p.id, p.userId),
	],
	when: (p, f) => f.or([
		f.not(f.exists(e.id)),
		f.eq(e.userId, 1),
		f.eq(e.profile.age, 2),
	])
})
```



```ts
// ---------------
// old

await updateItem({
	update: exp => exp.setItem(data),
	condition: exp => exp.where('slug').exists,
})

// ---------------
// new

await updateItem({
	update: e => e.set(item),
	when: e => e.slug.exists,
})
```




```ts

// Awsless v3
updateItem({
	update: (p, f) => [
		f.set(p.userId, 1),
		f.delete(p.profile),
		f.set(p.id, p.userId)
	],
	when: (p, f) => f.or([
		f.not(f.exists(p.id)),
		f.eq(p.userId, 1),
		f.eq(p.profile.age, 2)
	])
})

// Awsless v2
updateItem({
	userId: { $set: 1 },
	profile: { $delete: true },
	id: { $copy: 'userId' },
	when: {
		$or: [
			{ id: { $exists: false } },
			{ userId: 1 },
			{ 'profile.age': 2 }
		]
	}
})

// MongoDB


await updateItem({
	update: e => [
		e.profile.age.$set(1),
		e.profile.age.$incr(e.userId),
	],
	when: e => e.slug.$exists(),
})


await updateItem({
	update: e => [
		e.comments[0].message.set('').
		e.profile.age.set(1),
		e.profile.age.incr(e.userId),
	],
	when: e => e.slug.exists(),
})

const userId = 1

db.users.updateOne(
  { _id: 1 },
  [
    { $set: { username: "$name.deep.id" } }
  ]
);

const id = '1'
const id = { $nq: 1 }

updateItem({
	update: {
		$set: {
			'_root': item,
			userId: 1,
			'profile.age': 1,
			'profile.age': 1
		},
		$copy: {
			'profile.age': '$userId'
		},
		$incr: {
			'profile.age': 1
		}
	},
	query: {
		$or: [
			{ id },
			{ userId: 1 },
			{ "profile.age": 2 }
		]
	}
})


// updateItem({
// 	update: {
// 		$set: {
// 			userId: 1,
// 			id: 'userId',
// 		},
// 		$delete: {
// 			profile: ""
// 		}
// 	},
// 	query: {
// 		$or: [
// 			{ id: { $exists: false } },
// 			{ userId: 1 },
// 			{ "profile.age": 2 }
// 		]
// 	}
// })

```





```ts
updateItem({
	update: e => [
		e('userId').set(1),
		e('profile').delete(),
		// Set a property to an other property.
		e('id').set(e('userId')),
	],
	when: e => e.or([
		e.not(e('id').exists()),
		e('userId').eq(1),
		e('profile', 1, 'age').eq(1),
	])
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
