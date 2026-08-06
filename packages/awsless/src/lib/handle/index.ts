// The handler factories of every awsless feature. Each one wraps the
// plain lambda handler with the right event schema, so handler files
// declare WHAT they handle & the payload arrives parsed and typed.
//
//   export default h.queue(v.object({ n: v.number() }), async jobs => {})
//
// Every concern lives in its own module & the nested namespaces are
// real module namespaces, so unused handlers tree-shake away.

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
