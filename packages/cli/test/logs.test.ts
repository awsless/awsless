import { describe, expect, it } from 'vitest'
import { matchGroups, originFromLogGroup, parseLogLine } from '../src/cli/command/logs/util'

describe('logs command', () => {
	describe('parse log line', () => {
		it('should parse lambda application logs', () => {
			const line = parseLogLine(
				JSON.stringify({
					timestamp: '2026-08-04T10:00:00.000Z',
					level: 'INFO',
					requestId: 'r-1',
					message: 'hello world',
				})
			)

			expect(line).toStrictEqual({
				level: 'INFO',
				date: new Date('2026-08-04T10:00:00.000Z'),
				message: 'hello world',
			})
		})

		it('should read the route property of runtime errors', () => {
			const line = parseLogLine(
				JSON.stringify({
					timestamp: '2026-08-04T10:00:00.000Z',
					level: 'ERROR',
					requestId: 'r-1',
					message: {
						errorType: 'Error',
						errorMessage: 'It broke',
						route: 'stack-1:task:work',
					},
				})
			)

			expect(line.route).toBe('stack-1:task:work')
			expect(line.message).toBe(JSON.stringify({ errorType: 'Error', errorMessage: 'It broke' }, undefined, 2))
		})

		it('should mark platform logs as system logs', () => {
			const line = parseLogLine(
				JSON.stringify({
					type: 'platform.report',
					time: '2026-08-04T10:00:00.000Z',
					record: { requestId: 'r-1', status: 'timeout' },
				})
			)

			expect(line.level).toBe('SYSTEM')
			expect(line.date).toStrictEqual(new Date('2026-08-04T10:00:00.000Z'))
		})

		it('should pass raw text lines through untouched', () => {
			const line = parseLogLine('plain container output')

			expect(line).toStrictEqual({
				level: 'INFO',
				message: 'plain container output',
			})
		})
	})

	describe('log group origin', () => {
		it('should map log group names to their logical resource', () => {
			expect(originFromLogGroup('/aws/lambda/my-app--function--bundle', 'my-app')).toBe('function:bundle')
			expect(originFromLogGroup('/aws/lambda/my-app--stack-1--function--site-ssr', 'my-app')).toBe(
				'stack-1:function:site-ssr'
			)
			expect(originFromLogGroup('/aws/ecs/my-app--stack-1--instance--worker', 'my-app')).toBe(
				'stack-1:instance:worker'
			)
			expect(originFromLogGroup('/aws/ecs/my-app--stack-1--job--sync', 'MyApp')).toBe('stack-1:job:sync')
		})

		it('should keep foreign log group names as is', () => {
			expect(originFromLogGroup('/aws/lambda/other-thing', 'my-app')).toBe('other-thing')
		})
	})

	describe('group matching', () => {
		it('should stream everything without groups', () => {
			expect(matchGroups('function:bundle', [])).toBe(true)
		})

		it('should match a bare name against any segment', () => {
			expect(matchGroups('function:bundle', ['bundle'])).toBe(true)
			expect(matchGroups('stack:function:standalone', ['stack'])).toBe(true)
			expect(matchGroups('stack:function:standalone', ['standalone'])).toBe(true)
			expect(matchGroups('stack:function:standalone', ['other'])).toBe(false)
			expect(matchGroups('stack:function:standalone-caller', ['standalone'])).toBe(false)
		})

		it('should match full origins & wildcard patterns', () => {
			expect(matchGroups('stack:function:standalone', ['stack:function:standalone'])).toBe(true)
			expect(matchGroups('stack:instance:worker', ['*:instance:*'])).toBe(true)
			expect(matchGroups('stack:function:standalone', ['*:instance:*'])).toBe(false)
			expect(matchGroups('function:bundle', ['*'])).toBe(true)
		})
	})
})
