import type { BigFloat } from '@awsless/big-float'
import { h, Postgres, sql, v } from 'awsless'

// The table & its columns are checked against the stack file. What an
// aggregate returns isn't something the builder can know, so the sum says
// it itself: a sum of numerics is a numeric, which arrives as a BigFloat.
export default h.func(v.object({ customer: v.string() }), async ({ customer }) => {
	return Postgres.db
		.selectFrom('billing.invoices')
		.select(eb => [
			eb.cast<number>(eb.fn.countAll(), 'integer').as('invoices'),
			eb.fn.coalesce(eb.fn.agg<BigFloat | null>('sum', ['amount']), sql<BigFloat>`0`).as('total'),
		])
		.where('customer', '=', customer)
		.where('paid_at', 'is', null)
		.executeTakeFirstOrThrow()
})
