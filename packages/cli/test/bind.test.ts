import { Command } from 'commander'
import { describe, expect, it, vi } from 'vitest'
import { bind } from '../src/cli/command/bind'

// The command module reaches the program through the layout, which
// would pull the whole command registry into this test.
vi.mock('../src/cli/program', () => ({ program: { optsWithGlobals: () => ({}) } }))

describe('bind command', () => {
	it('should collect every --config value', () => {
		const program = new Command()

		bind(program)

		const command = program.commands.find(command => command.name() === 'bind')!

		command.parseOptions(['--config', 'a', 'b', '--config', 'c,d'])

		expect(command.opts().config).toEqual(['a', 'b', 'c,d'])
	})
})
