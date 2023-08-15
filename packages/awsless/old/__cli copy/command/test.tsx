import { Command } from "commander";
import { render, Text } from 'ink'
import { Logo } from "../ui/components/logo.js";

export const test = (program: Command) => {
	program
		.command('test')
		.description('Test')
		.action(async () => {
			render(<Logo />)
		})
}
