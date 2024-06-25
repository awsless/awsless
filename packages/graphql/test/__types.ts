import type { Arg } from '../src'

// Scalar Types

export type Scalars = {
	AWSDateTime: string
	Int: number
	ID: string
	Float: number
	String: string
	Boolean: boolean
}

// Request Types

export type DiceRequest = {
	number?: boolean | number
	[key: `${string}:number`]: boolean | number

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type KenoRequest = {
	numbers?: boolean | number
	[key: `${string}:numbers`]: boolean | number

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type GameStateRequest = {
	['...on Dice']?: DiceRequest
	['...on Keno']?: KenoRequest
	__typename?: boolean | number
}

export type GameRequest = {
	state?: GameStateRequest
	[key: `${string}:state`]: GameStateRequest

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type TransactionRequest = {
	id?: boolean | number
	[key: `${string}:id`]: boolean | number

	amount?: boolean | number
	[key: `${string}:amount`]: boolean | number

	currency?: boolean | number
	[key: `${string}:currency`]: boolean | number

	createdAt?: boolean | number
	[key: `${string}:createdAt`]: boolean | number

	updatedAt?: boolean | number
	[key: `${string}:updatedAt`]: boolean | number

	['...on Deposit']?: DepositRequest
	['...on Withdraw']?: WithdrawRequest
	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type DepositRequest = {
	id?: boolean | number
	[key: `${string}:id`]: boolean | number

	amount?: boolean | number
	[key: `${string}:amount`]: boolean | number

	currency?: boolean | number
	[key: `${string}:currency`]: boolean | number

	createdAt?: boolean | number
	[key: `${string}:createdAt`]: boolean | number

	updatedAt?: boolean | number
	[key: `${string}:updatedAt`]: boolean | number

	from?: boolean | number
	[key: `${string}:from`]: boolean | number

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type WithdrawRequest = {
	id?: boolean | number
	[key: `${string}:id`]: boolean | number

	amount?: boolean | number
	[key: `${string}:amount`]: boolean | number

	currency?: boolean | number
	[key: `${string}:currency`]: boolean | number

	createdAt?: boolean | number
	[key: `${string}:createdAt`]: boolean | number

	updatedAt?: boolean | number
	[key: `${string}:updatedAt`]: boolean | number

	to?: boolean | number
	[key: `${string}:to`]: boolean | number

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type LogInput = {
	messages: Scalars['String'][]
}

export type RateRequest = {
	amount?: boolean | number
	[key: `${string}:amount`]: boolean | number

	currency?: boolean | number
	[key: `${string}:currency`]: boolean | number

	updatedAt?: boolean | number
	[key: `${string}:updatedAt`]: boolean | number

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type TokenResponseRequest = {
	/** @deprecated not supported anymore */
	idToken?: boolean | number
	/** @deprecated not supported anymore */
	[key: `${string}:idToken`]: boolean | number

	accessToken?: boolean | number
	[key: `${string}:accessToken`]: boolean | number

	refreshToken?: boolean | number
	[key: `${string}:refreshToken`]: boolean | number

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type QueryRequest = {
	status?: boolean | number
	[key: `${string}:status`]: boolean | number

	logs?: boolean | number
	[key: `${string}:logs`]: boolean | number

	rates?: RateRequest
	[key: `${string}:rates`]: RateRequest

	transactions?: { __args?: {limit?:Arg<'Int', (Scalars['Int'] | undefined)> | (Scalars['Int'] | undefined),cursor?:Arg<'String', (Scalars['String'] | undefined)> | (Scalars['String'] | undefined)} } & TransactionRequest
	[key: `${string}:transactions`]: { __args?: {limit?:Arg<'Int', (Scalars['Int'] | undefined)> | (Scalars['Int'] | undefined),cursor?:Arg<'String', (Scalars['String'] | undefined)> | (Scalars['String'] | undefined)} } & TransactionRequest

	games?: GameRequest
	[key: `${string}:games`]: GameRequest

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}

export type MutationRequest = {
	transact?: { __args: {amount:Arg<'Float!', Scalars['Float']> | Scalars['Float'],currency:Arg<'Currency!', Currency> | Currency} } & TransactionRequest
	[key: `${string}:transact`]: { __args: {amount:Arg<'Float!', Scalars['Float']> | Scalars['Float'],currency:Arg<'Currency!', Currency> | Currency} } & TransactionRequest

	login?: { __args: {email:Arg<'String!', Scalars['String']> | Scalars['String'],password:Arg<'String!', Scalars['String']> | Scalars['String']} } & TokenResponseRequest
	[key: `${string}:login`]: { __args: {email:Arg<'String!', Scalars['String']> | Scalars['String'],password:Arg<'String!', Scalars['String']> | Scalars['String']} } & TokenResponseRequest

	log?: { __args: {input:Arg<'LogInput!', LogInput> | LogInput} }
	[key: `${string}:log`]: { __args: {input:Arg<'LogInput!', LogInput> | LogInput} }

	addProduct?: { __args: {products:Arg<'[ID!]!', Scalars['ID'][]> | Scalars['ID'][]} }
	[key: `${string}:addProduct`]: { __args: {products:Arg<'[ID!]!', Scalars['ID'][]> | Scalars['ID'][]} }

	__typename?: boolean | number
	[key: `${string}:__typename`]: boolean | number
}



// Response Types

export type Currency = 'EUR' | 'USD'

export type Dice = {
	number: Scalars['Int']
	[key: `${string}:number`]: Scalars['Int']

	__typename: 'Dice'
	[key: `${string}:__typename`]: 'Dice'
}

export type Keno = {
	numbers: Scalars['Int'][]
	[key: `${string}:numbers`]: Scalars['Int'][]

	__typename: 'Keno'
	[key: `${string}:__typename`]: 'Keno'
}

export type GameState = {
	__union: {
		['...on Dice']: Dice
		['...on Keno']: Keno
	}
}

export type Game = {
	state: GameState
	[key: `${string}:state`]: GameState

	__typename: 'Game'
	[key: `${string}:__typename`]: 'Game'
}

export type Transaction = {
	__union: {
		['...on Deposit']: Deposit
		['...on Withdraw']: Withdraw
	}
}

export type Deposit = {
	id: Scalars['ID']
	[key: `${string}:id`]: Scalars['ID']

	amount: Scalars['Float']
	[key: `${string}:amount`]: Scalars['Float']

	currency: Currency
	[key: `${string}:currency`]: Currency

	createdAt: Scalars['AWSDateTime']
	[key: `${string}:createdAt`]: Scalars['AWSDateTime']

	updatedAt?: (Scalars['AWSDateTime'] | undefined)
	[key: `${string}:updatedAt`]: (Scalars['AWSDateTime'] | undefined)

	from: Scalars['String']
	[key: `${string}:from`]: Scalars['String']

	__typename: 'Deposit'
	[key: `${string}:__typename`]: 'Deposit'
}

export type Withdraw = {
	id: Scalars['ID']
	[key: `${string}:id`]: Scalars['ID']

	amount: Scalars['Float']
	[key: `${string}:amount`]: Scalars['Float']

	currency: Currency
	[key: `${string}:currency`]: Currency

	createdAt: Scalars['AWSDateTime']
	[key: `${string}:createdAt`]: Scalars['AWSDateTime']

	updatedAt?: (Scalars['AWSDateTime'] | undefined)
	[key: `${string}:updatedAt`]: (Scalars['AWSDateTime'] | undefined)

	to: Scalars['String']
	[key: `${string}:to`]: Scalars['String']

	__typename: 'Withdraw'
	[key: `${string}:__typename`]: 'Withdraw'
}

export type Rate = {
	amount: Scalars['Float']
	[key: `${string}:amount`]: Scalars['Float']

	currency: Currency
	[key: `${string}:currency`]: Currency

	updatedAt?: (Scalars['AWSDateTime'] | undefined)
	[key: `${string}:updatedAt`]: (Scalars['AWSDateTime'] | undefined)

	__typename: 'Rate'
	[key: `${string}:__typename`]: 'Rate'
}

export type TokenResponse = {
	/** @deprecated not supported anymore */
	idToken: Scalars['String']
	/** @deprecated not supported anymore */
	[key: `${string}:idToken`]: Scalars['String']

	accessToken: Scalars['String']
	[key: `${string}:accessToken`]: Scalars['String']

	refreshToken: Scalars['String']
	[key: `${string}:refreshToken`]: Scalars['String']

	__typename: 'TokenResponse'
	[key: `${string}:__typename`]: 'TokenResponse'
}

export type Query = {
	status?: (Scalars['Boolean'] | undefined)
	[key: `${string}:status`]: (Scalars['Boolean'] | undefined)

	logs?: ((Scalars['String'] | undefined)[] | undefined)
	[key: `${string}:logs`]: ((Scalars['String'] | undefined)[] | undefined)

	rates: Rate[]
	[key: `${string}:rates`]: Rate[]

	transactions: Transaction[]
	[key: `${string}:transactions`]: Transaction[]

	games: Game[]
	[key: `${string}:games`]: Game[]

	__typename: 'Query'
	[key: `${string}:__typename`]: 'Query'
}

export type Mutation = {
	transact: Transaction
	[key: `${string}:transact`]: Transaction

	login: TokenResponse
	[key: `${string}:login`]: TokenResponse

	log: Scalars['Boolean']
	[key: `${string}:log`]: Scalars['Boolean']

	addProduct: Scalars['Boolean']
	[key: `${string}:addProduct`]: Scalars['Boolean']

	__typename: 'Mutation'
	[key: `${string}:__typename`]: 'Mutation'
}



// Schema Types

export type QuerySchema = {
	request: QueryRequest
	response: Query
}
export type MutationSchema = {
	request: MutationRequest
	response: Mutation
}

export type Schema = {
	query: QuerySchema
	mutate: MutationSchema
}