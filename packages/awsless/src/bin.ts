#!/usr/bin/env node

import { program } from "./cli/program.js";

program.parse(process.argv)

// const main = async () => {
// 	await program.parseAsync(process.argv)

// 	process.stdout.cursorTo(0, process.stdout.rows)
// }

// main()
