```ts
import { updateItem } from '@awsless/dynamodb';

await updateItem({
	update: e => [
		e.profile.age.set(1),
		e.profile.age.incr(e.userId),
	],
	when: e => e.and([
		e.slug.gt(1),
		e.or([
			e.slug.exists()),
			e.size(e.slug).gt(0)
		]),
	])
})
```

```ts
import { updateItem, size, and, or } from '@awsless/dynamodb';

await updateItem({
	update: e => [
		e.profile.age.set(1),
		e.profile.age.incr(e.userId),
	],
	when: e => and([
		e.slug.gt(1),
		or([
			e.slug.exists()),
			size(e.slug).gt(0)
		]),
	])
})
```
