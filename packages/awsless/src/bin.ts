#!/usr/bin/env node

import { program } from './cli/program.js';

// process.env.AWSLESS_CLI = '1'
program.parse(process.argv)
