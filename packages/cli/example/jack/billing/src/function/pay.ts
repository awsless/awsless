import { h, Postgres, v } from 'awsless'

// A transaction: the payment and the invoice change together, or not at all.
export default h.func(v.object({ id: v.string() }), async ({ id }) => {
	return Postgres.db.transaction().execute(async transaction => {
		const invoice = await transaction
			.updateTable('billing.invoices')
			.set({ paid_at: new Date() })
			.where('id', '=', id)
			.where('paid_at', 'is', null)
			.returning(['id', 'amount'])
			.executeTakeFirst()

		if (!invoice) {
			throw new Error(`Invoice ${id} doesn't exist or is already paid.`)
		}

		await transaction
			.insertInto('billing.payments')
			.values({ invoice_id: invoice.id, amount: invoice.amount })
			.execute()

		return { id: invoice.id, paid: invoice.amount }
	})
})
