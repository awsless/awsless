import { ClientPasswordChallenge, UserPool } from 'cognito-srp'
import { srp, generateVerifier } from '../src/index'
import { fromHex } from '../src/helper/encoding'

type Props = {
	userPool: string
	a: string
	username: string
	password: string
	B: string
	salt: string
	secretBlock: string
	timestamp: string
}

const p1 = ({ userPool, a, username, password, B, salt, secretBlock, timestamp }: Props) => {
	const challenge = new ClientPasswordChallenge(userPool, { username, password }, a)
	const A = challenge.calculateA()
	const session = challenge.getSession(B, salt)
	const signature = session.calculateSignature(secretBlock, timestamp)

	return [A.toString('hex'), signature]
}

const p2 = async ({ userPool, a, username, password, B, salt, secretBlock, timestamp }: Props) => {
	const [A, next] = await srp(userPool, fromHex(a))
	const [signature] = await next(username, password, B, salt, secretBlock, timestamp)

	return [A, signature]
}

describe('srp', () => {
	const userPool = '7DZy4Fkn7'
	const username = 'user'
	const password = 'pass'
	const salt = '826953c1fef39d3d60fc30b6e0b88a23'
	const B =
		'2a7329c4a8773f518c34f832cdb834f64b2d67e049f73702ab26fca16d7ff3d26794f0a2c23e33509db64ce8e9d5364bfbbb7f10e40fe91c75fcad1a6a7ce9f6eb6c74c6490b0724e62dab6b795193e4fdbb3630a04cba40a289b50a034e16b1441b5414a0f8a19dd1b501fe7593c84af59f85771e5cdfa812f1c5e60e7e0c8fdde2542bae59bbade61c7a8b07bbb6212720fd2c3b0fc92c465daa4c9f5239cb62ee29faa7b0d73f40ae72b50a6e18f92a792adaea89496c58da669037a9c1c19abcd552cd066a9cdae4055dfbfbde5792612771ad000ef88b164cd5e626a5e61e3b16d91fb4035aefbc19a14e067e3ebf3aa2d52499cda3315c111987f94d0075799b2e97629ee6614555b3aa5b9fa8a4e7e15af29c19d88dde0fd7665d3d73c720a1aa41358fa2a4437ac43bbe5abc8c238eeaaf410a7770d010ad01329e5b453f38e57a9530b989160718127243d6a35195b795eaa73534268b60205a5ec83a052dec8ea5629529eee2a9dfd418878f8e485f68ca0b75089044dde96a7730'
	const secretBlock =
		'D6ZXYTJYQ62+ocL9DmyuZ6p8mIw3jneIzPWJwF+vw0HoPa3wAZc+CgPXgg9TIMp0yvrHPFaUeVXpmbxgfT70n2RhA+GbH+tdg19A4fwCox5FEMedcI1/378pZeN6GlvqqgPTkUo3iIF+/Pg5GceROaK+ex5kXcNsdLpmeRDk6TLwLfhQHecph1n9wafiaUcby1Z5r5kKCZlxR+uWjxsQJI5+wuGgwo1hpMjuT4u7+V8Y3/yojE8vJY/csE0C6ZgU9rwQAySJzLkKes4Uo5R6nA32ocoQp+BtmN5ARdwan7lIME/zHA4xFCSzUUl5HQzofugaRJgl1J5+AqVKUkPpmausi4FkrXzLH3S1JnRzO/UxykPm/V9IsUlKJxjl+WozRUJe0oepxbrxJ+Zh7vX5cqS+A2ZSI3gQFvuU2C2nOuLX1wSaMMIBpSC1/n3TG6WwECkl3n+eGqX2hORQbCkrDIeHipn/mdTZ+vzTbpJLvFsmB5HW9+lu9tRK2ClkyfEnnqdW4wtReulqD9x79FfcWxosme8/1Ei0ZHoM/KmsdyHxldDTiuvwRuvTvj3ijUDvBTQ3l2et7ygZdDLBORSV6KxSTQPcpmw1eUdhe6l7UWveMc/298aYb250PFk60XsWcnvg8xcMa63WGFIt5Ihf7/mjDVENIGIz88kwwnpgTwAhp7n+YmwvIwRumRNCXjI2jv7GHwriCbo/n/m30eRjFyW/zA8RWpqbyXdliv5MWWBjPokoo+hH84z3sbyXZHqabwNSFyKUHLr7EjqN1UhJ+BuvVta6hBWhDQmIMee51LZ20EebjdQG0GK7cvI+7VXPvtozII80762/tH55SMuW4+lT6Jn5A83c7HTqcpQel80ZCxrf5fDecflQdcQbKf0apDHSig3jzIIM6HIbrgn0TwjQME6bniKErO1eWcpMywlKTziA1mH6riW2avr82GeCCwBDu8Sb7KQBdPk+bFWDRi2T9sEEC0mcuvKeSJjIqAurYhzeD7rnSctujEBVH3ZVBOAFARuXs/iXpXSHqM2n1g+DwYofFbW6/EGQUlflALw7dtn7nnvXwY7hikKKmZCa33RqmRsj1krpO54WPUgYqUtfw05j2ZR84IrnkoI5GEF6HQbsnEg9wRbxtH8VK1EIUclcQ+A3KRSOLhCMb5oRbzTxbykRQlFnlok3PN4TLxp3RpYOiR+C+e6Tyl/liP/0A0OzofIzFN3AV87X2bF/BT9rklxoOKQ++b9oXI/bGrKs0brOp6jTtR7iEDqO63v2BZs83RfPGlRbK5w2I5DoBedd4yQ4tTFAF78iw3bg0OAVE8HKQ1UADQhoCsbjPlS8s2lPHtdX+vfHY2dqBhYzCpa3oE3rYgy7JFlGMSMkDwrOEyrlRNlDqoD2MWUCmwwyslavwuj0G0VdIuI7d14mLnpk2xWrg2S/8nXhJiRyVw+7f6ak9hBSqTkMKkM/KoaJJrWiBDDofL2fXIVmkgWnhvQ5RTm6fA6HzSXnHV1YUkFDDt5N1twgu+bwWTaLjoy5rBneUepq5pR0QQc1WcmJFEuQcv9x4fd80P2zWakSEfqHDQLCIgENda5lYmppKR0xG08zq1VWORq00yc8oZli2SAMby8xkGUUtLRulUDCiLS+g0zQA7jFBhxgI4ptO+8L2/uwsSssrZwsGOKdHRmXbMO1lF/VMrlheZMaEza849rmh9eUVEiz5YuJ'
	const timestamp = 'Mon May 0 00:00:00 UTC 2022'

	it('compare results with cognito-srp', async () => {
		const params = {
			userPool,
			a: 'ff',
			username,
			password,
			salt,
			B,
			secretBlock,
			timestamp,
		}

		const result1 = p1(params)
		const result2 = await p2(params)

		expect(result1).toStrictEqual(result2)
	})

	it('create verifier', async () => {
		const pool = new UserPool(userPool)
		const result1 = await pool.createUser({ username, password }, 'ff22')
		const verifier1 = Buffer.from(result1.verifier, 'hex').toString('base64')
		const salt1 = Buffer.from(result1.salt, 'hex').toString('base64')

		const [verifier2, salt2] = await generateVerifier(userPool, username, password, fromHex('ff22'))

		expect(verifier1).toBe(verifier2)

		expect(salt1).toBe(salt2)
	})
})
