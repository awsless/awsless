import { join } from 'node:path'
import protobufjs from 'protobufjs'

const root = protobufjs.loadSync(join(import.meta.dirname, './protocol/tfplugin6.0.proto'))

// Alternative way without loading proto string from file
// const root = protobufjs.parse('syntax = "proto3"; ...').root;​

console.log(JSON.stringify(root.toJSON()))
