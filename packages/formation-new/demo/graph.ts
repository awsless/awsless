import { DirectedGraph } from 'graphology'
import { topologicalGenerations } from 'graphology-dag'
import { DependencyGraph } from '../src/formation/workspace/dependency.ts'

const sleep = (delay: number) => {
	return new Promise(r => {
		setTimeout(r, delay)
	})
}

// const graph = new DirectedGraph()

// // graph.mergeEdge('1', '2')
// graph.addNode('1')
// graph.mergeEdge('1', '2')

// graph.addNode('2')

// graph.addEdge('2', '1')

// console.log(topologicalGenerations(graph))

const graph = new DependencyGraph()

graph.add('urn:1', [], async () => {
	await sleep(1000)
	console.log(1)
})

graph.add('urn:2', ['urn:1'], async () => {
	await sleep(1000)
	console.log(2)
	// throw new Error('lol')
})

graph.add('urn:3', ['urn:4'], async () => {
	await sleep(1000)
	console.log(3)
	// throw new Error('lol')
})

console.log(await graph.run())
