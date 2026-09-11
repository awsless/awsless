export type ErrorCause = { type: string; reason: string }

export class OpenSearchError extends Error {
	readonly type: string
	readonly status: number
	readonly reason: string
	readonly rootCause: ErrorCause
	readonly extra: Record<string, unknown>

	constructor(
		type: string,
		status: number,
		reason: string,
		options: { rootCause?: ErrorCause; extra?: Record<string, unknown> } = {}
	) {
		super(`${type}: ${reason}`)
		this.name = 'OpenSearchError'
		this.type = type
		this.status = status
		this.reason = reason
		this.rootCause = options.rootCause ?? { type, reason }
		this.extra = options.extra ?? {}
	}

	toBody() {
		return {
			error: {
				root_cause: [this.rootCause],
				type: this.type,
				reason: this.reason,
				...this.extra,
			},
			status: this.status,
		}
	}
}

// Every gap in the emulation reports itself the same way, so a developer
// never has to guess why the local server matched nothing.
export const unsupported = (what: string) => {
	return new OpenSearchError(
		'illegal_argument_exception',
		400,
		`The local OpenSearch server does not support ${what}.`
	)
}

export const indexNotFound = (index: string) => {
	return new OpenSearchError('index_not_found_exception', 404, `no such index [${index}]`, {
		extra: { index, 'resource.type': 'index_or_alias', 'resource.id': index, index_uuid: '_na_' },
	})
}

export const indexExists = (index: string) => {
	return new OpenSearchError('resource_already_exists_exception', 400, `index [${index}/local] already exists`, {
		extra: { index },
	})
}

export const documentMissing = (index: string, id: string) => {
	return new OpenSearchError('document_missing_exception', 404, `[${id}]: document missing`, {
		extra: { index, shard: '0' },
	})
}

export const versionConflict = (index: string, id: string) => {
	return new OpenSearchError(
		'version_conflict_engine_exception',
		409,
		`[${id}]: version conflict, document already exists (current version [1])`,
		{ extra: { index, shard: '0' } }
	)
}

export const illegalArgument = (reason: string) => {
	return new OpenSearchError('illegal_argument_exception', 400, reason)
}

export const parsingError = (reason: string) => {
	return new OpenSearchError('parsing_exception', 400, reason)
}

export const mapperParsing = (reason: string) => {
	return new OpenSearchError('mapper_parsing_exception', 400, reason)
}

export const strictDynamic = (field: string, parent: string = '_doc') => {
	return new OpenSearchError(
		'strict_dynamic_mapping_exception',
		400,
		`mapping set to strict, dynamic introduction of [${field}] within [${parent}] is not allowed`
	)
}

export const queryShard = (reason: string) => {
	return new OpenSearchError('query_shard_exception', 400, reason)
}

// Search failures are reported the way a real cluster does: the original
// error becomes the root cause of a search_phase_execution_exception.
export const wrapSearchError = (error: unknown, index: string): OpenSearchError => {
	if (!(error instanceof OpenSearchError)) {
		throw error
	}

	if (error.type === 'search_phase_execution_exception') {
		return error
	}

	const cause = { type: error.type, reason: error.reason }

	return new OpenSearchError('search_phase_execution_exception', error.status, error.reason, {
		rootCause: cause,
		extra: {
			phase: 'query',
			grouped: true,
			failed_shards: [{ shard: 0, index, node: 'local', reason: cause }],
			caused_by: cause,
		},
	})
}
