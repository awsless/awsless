// Operators parse into the function calls ClickHouse rewrites them to, so
// `a + 1` is plus(a, 1), the name the result column gets too.
export type Expr = (
	| { kind: 'literal'; value: unknown; text?: string }
	| { kind: 'identifier'; parts: string[] }
	| { kind: 'function'; name: string; args: Expr[]; params?: Expr[]; distinct?: boolean; over?: boolean }
	| { kind: 'param'; name: string; type: string }
	| { kind: 'asterisk'; table?: string; except?: string[] }
	| { kind: 'lambda'; params: string[]; body: Expr }
	| { kind: 'subquery'; query: Query }
) & { alias?: string }

export type OrderItem = {
	expr: Expr
	direction: 'ASC' | 'DESC'
	nulls?: 'FIRST' | 'LAST'
}

export type TableSource =
	| { kind: 'table'; database?: string; name: string; alias?: string; final?: boolean }
	| { kind: 'subquery'; query: Query; alias?: string; final?: boolean }
	| { kind: 'function'; name: string; args: Expr[]; alias?: string }

export type Join = {
	kind: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
	strictness?: 'ANY' | 'ALL'
	source: TableSource
	on?: Expr
	using?: string[]
}

export type Select = {
	kind: 'select'
	with: { name: string; expr?: Expr; query?: Query }[]
	distinct: boolean
	columns: Expr[]
	from?: TableSource
	joins: Join[]
	arrayJoin?: { exprs: Expr[]; left: boolean }
	where?: Expr
	prewhere?: Expr
	groupBy: Expr[]
	withTotals: boolean
	having?: Expr
	orderBy: OrderItem[]
	limitBy?: { limit: number; offset: number; exprs: Expr[] }
	limit?: number
	offset?: number
	settings: Record<string, unknown>
}

export type Query = { kind: 'union'; selects: Select[]; distinct: boolean[] }

export type ColumnDef = {
	name: string
	type?: string
	defaultKind?: 'DEFAULT' | 'MATERIALIZED' | 'ALIAS' | 'EPHEMERAL'
	defaultExpr?: Expr
	codec?: string
	comment?: string
	ttl?: Expr
}

export type IndexDef = {
	name: string
	expr: Expr
	type: string
	granularity: number
}

export type Statement =
	| { kind: 'query'; query: Query; format?: string; settings: Record<string, unknown>; text: string }
	| {
			kind: 'create-table'
			ifNotExists: boolean
			database?: string
			name: string
			columns: ColumnDef[]
			indexes: IndexDef[]
			engine: { name: string; args: Expr[] }
			partitionBy?: Expr
			primaryKey?: Expr[]
			orderBy?: Expr[]
			ttl?: Expr
			settings: [string, unknown][]
			comment?: string
			as?: Query
			orReplace: boolean
	  }
	| { kind: 'create-database'; ifNotExists: boolean; name: string }
	| { kind: 'drop-table'; ifExists: boolean; database?: string; name: string }
	| { kind: 'drop-database'; ifExists: boolean; name: string }
	| { kind: 'truncate'; ifExists: boolean; database?: string; name: string }
	| { kind: 'rename-table'; from: { database?: string; name: string }; to: { database?: string; name: string } }
	| { kind: 'alter'; database?: string; name: string; actions: AlterAction[] }
	| { kind: 'delete'; database?: string; name: string; where: Expr }
	| {
			kind: 'insert'
			database?: string
			name: string
			columns?: string[]
			format?: string
			data?: string
			values?: Expr[][]
			select?: Query
			settings: Record<string, unknown>
	  }
	| { kind: 'optimize'; database?: string; name: string; final: boolean }
	| { kind: 'exists'; database?: string; name: string; format?: string }
	| { kind: 'show-tables'; format?: string }
	| { kind: 'show-create'; database?: string; name: string; format?: string }
	| { kind: 'describe'; database?: string; name: string; format?: string }
	| { kind: 'set'; settings: Record<string, unknown> }
	| { kind: 'use'; database: string }

export type AlterAction =
	| { kind: 'add-column'; ifNotExists: boolean; column: ColumnDef; first?: boolean; after?: string }
	| { kind: 'drop-column'; ifExists: boolean; name: string }
	| { kind: 'modify-column'; ifExists: boolean; column: ColumnDef; remove?: string; first?: boolean; after?: string }
	| { kind: 'rename-column'; ifExists: boolean; from: string; to: string }
	| { kind: 'comment-column'; ifExists: boolean; name: string; comment: string }
	| { kind: 'add-index'; ifNotExists: boolean; index: IndexDef; first?: boolean; after?: string }
	| { kind: 'drop-index'; ifExists: boolean; name: string }
	| { kind: 'materialize-index'; name: string }
	| { kind: 'clear-index'; name: string }
	| { kind: 'modify-ttl'; ttl: Expr }
	| { kind: 'remove-ttl' }
	| { kind: 'modify-setting'; settings: [string, unknown][] }
	| { kind: 'reset-setting'; names: string[] }
	| { kind: 'modify-comment'; comment: string }
	| { kind: 'modify-order-by'; exprs: Expr[] }
	| { kind: 'delete'; where: Expr }
	| { kind: 'update'; assignments: [string, Expr][]; where: Expr }
	| { kind: 'materialize-column'; name: string }
	| { kind: 'materialize-ttl' }

export const fn = (name: string, ...args: Expr[]): Expr => ({ kind: 'function', name, args })

export const literal = (value: unknown, text?: string): Expr => ({ kind: 'literal', value, text })
