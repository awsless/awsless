import { Input as I } from '../../src/formation/input.ts'
import { Output as O } from '../../src/formation/output.ts'
import { ResourceClass as R, State } from '../../src/formation/resource.ts'

export type Input<T> = I<T>
export type OptionalInput<T> = I<T> | I<T | undefined> | I<undefined>
export type Output<T> = O<T>
export type ResourceClass<I extends State, O extends State, T extends string> = R<I, O, T>

export type DataSource<I extends State, O extends State> = (props: I) => O
