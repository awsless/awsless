import { BigFloat } from '@awsless/big-float'
import { Postgres } from 'awsless'
import create from '../src/function/create'
import outstanding from '../src/function/outstanding'
import pay from '../src/function/pay'
import payments from '../src/function/payments'

// Every test file gets a Postgres schema of its own, with the stack's tables.
describe('Billing', () => {
	it('creates invoices with an exact amount', async () => {
		const invoice = await create({ customer: 'jack', amount: new BigFloat('19.99') })

		expect(invoice).toStrictEqual({
			id: '1',
			customer: 'jack',
			amount: new BigFloat('19.99'),
			created_at: expect.any(Date),
		})
	})

	it('keeps a date inside the details document', async () => {
		const dueAt = new Date('2026-12-01T00:00:00.000Z')
		const invoice = await create({ customer: 'jack', amount: new BigFloat('0.01'), dueAt })

		const stored = await Postgres.db
			.selectFrom('billing.invoices')
			.select('details')
			.where('id', '=', invoice.id)
			.executeTakeFirstOrThrow()

		expect(stored.details).toStrictEqual({ dueAt })
	})

	it('adds up what a customer still owes, without rounding', async () => {
		expect(await outstanding({ customer: 'jack' })).toStrictEqual({ invoices: 2, total: new BigFloat('20.00') })
		expect(await outstanding({ customer: 'nobody' })).toStrictEqual({ invoices: 0, total: new BigFloat('0') })
	})

	it('pays an invoice and records the payment in one transaction', async () => {
		expect(await pay({ id: '1' })).toStrictEqual({ id: '1', paid: new BigFloat('19.99') })
		expect(await outstanding({ customer: 'jack' })).toStrictEqual({ invoices: 1, total: new BigFloat('0.01') })

		const payments = await Postgres.db.selectFrom('billing.payments').select(['invoice_id', 'amount']).execute()

		expect(payments).toStrictEqual([{ invoice_id: '1', amount: new BigFloat('19.99') }])
	})

	it('joins the payments of a customer to their invoices', async () => {
		const rows = await payments({ customer: 'jack' })

		// Typed by the stack file: an id is text, an amount a BigFloat, a moment a Date.
		const invoiceIds: string[] = rows.map(row => row.invoiceId)
		const paid: BigFloat[] = rows.map(row => row.paid)

		expect(invoiceIds).toStrictEqual(['1'])
		expect(paid).toStrictEqual([new BigFloat('19.99')])
		expect(rows).toStrictEqual([
			{
				invoiceId: '1',
				customer: 'jack',
				invoiced: new BigFloat('19.99'),
				paid: new BigFloat('19.99'),
				paidAt: expect.any(Date),
			},
		])
		expect(await payments({ customer: 'nobody' })).toStrictEqual([])
	})

	it('leaves nothing behind when paying fails', async () => {
		await expect(pay({ id: '1' })).rejects.toThrow("Invoice 1 doesn't exist or is already paid.")

		const [row] = await Postgres.query<{ payments: number }>(
			'SELECT count(*)::int AS payments FROM billing.payments'
		)

		expect(row).toStrictEqual({ payments: 1 })
	})
})
