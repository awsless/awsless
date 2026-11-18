import { h, Postgres, v } from 'awsless'

// A join: every column is typed by the table it comes from, and a name
// that two tables share has to say which one it means.
export default h.func(v.object({ customer: v.string() }), async ({ customer }) => {
	return Postgres.db
		.selectFrom('billing.payments as p')
		.innerJoin('billing.invoices as i', 'i.id', 'p.invoice_id')
		.select(['i.id as invoiceId', 'i.customer', 'i.amount as invoiced', 'p.amount as paid', 'p.paid_at as paidAt'])
		.where('i.customer', '=', customer)
		.orderBy('p.paid_at')
		.execute()
})
