#!/usr/bin/env bun

import { program } from './cli/program.js'
// @ts-ignore

// import stayAwake from 'stay-awake'
// stayAwake.prevent()

// process.env.AWSLESS_CLI = '1'
program.parse(process.argv)
