// One factory per feature, each wrapping the lambda handler with the
// right event schema. Real module namespaces, so unused handlers tree-shake.

export * from './failure.js'
export * from './func.js'
export * from './image.js'
export * from './queue.js'
export * from './route.js'
export * from './topic.js'

export * as pubsub from './pubsub.js'
export * as rpc from './rpc.js'
export * as store from './store.js'
export * as table from './table.js'
