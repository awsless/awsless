import { h, Postgres, v } from 'awsless'

// A typed insert: the columns & their types come from the stack file.
export default h.func(
	v.object({
		customer: v.string(),
		amount: v.bigfloat(),
		dueAt: v.optional(v.date()),
	}),
	async ({ customer, amount, dueAt }) => {
		const invoice = await Postgres.db
			.insertInto('billing.invoices')
			.values({
				customer,
				amount,
				// A Date inside the document is still a Date when it's read back.
				details: dueAt ? { dueAt } : null,
			})
			.returning(['id', 'customer', 'amount', 'created_at'])
			.executeTakeFirstOrThrow()

		return invoice
	}
)
