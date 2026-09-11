# @awsless/open-search-server

## Script sorting

`_script` sorts run a small Painless subset: `doc['field']` with `.value`, `.values`, `.size()`, `.length`, `.empty`, `.contains()`, `params`, arithmetic, comparisons, `&&` / `||` / `!`, the ternary, string methods (`toLowerCase`, `startsWith`, `endsWith`, `contains`, `equals`, `length`), `Math.max/min/abs/floor/ceil/round/sqrt/pow/log` and an optional leading `return`. Multi-statement scripts, variables, loops and anything else fail with an error naming the construct. Dates read as epoch milliseconds.

## Engines

The default engine is the in-memory implementation described below. The real OpenSearch distribution is available as an opt-in engine, downloaded on first use (on macOS it also needs a local JDK 21+):

```ts
import { OpenSearchServer } from '@awsless/open-search-server'

const server = new OpenSearchServer() // in-memory
const server = new OpenSearchServer({ engine: 'opensearch' }) // real distribution

await server.listen()
console.log(server.endpoint)
await server.close()
```

The opt-in real-engine test runs with `AWSLESS_LOCAL_ENGINE=real pnpm test`.

An in-memory OpenSearch server written in TypeScript, for tests and local development. It speaks enough of the OpenSearch REST API that the official `@opensearch-project/opensearch` client and `@awsless/open-search` work against it without a JDK, a download, or network access.

The scope is deliberately basic. Everything the server does not implement fails with a proper OpenSearch-shaped 400 error whose reason names the missing feature, so an app never silently matches nothing.

```ts
import { OpenSearchServer } from '@awsless/open-search-server'

const server = new OpenSearchServer()
await server.listen()

const client = new Client({ node: server.endpoint })

server.reset() // drop every index
await server.close()
```

Runs on Node 24 and Bun 1.4. Zero runtime dependencies.

## Supported

### Endpoints

- `GET /`, `HEAD /`, `GET /_cluster/health`, `GET /_cat/health?format=json`, `GET /_cat/indices?format=json`
- Indices: `HEAD|GET|PUT|DELETE /{index}` (`*`, `_all` and comma lists for GET/DELETE), `GET|PUT|POST /{index}/_mapping`, `GET /{index}/_settings`, `POST /{index}/_refresh`, `POST /_refresh`
- Documents: `PUT|POST /{index}/_doc/{id}`, `POST /{index}/_doc`, `PUT|POST /{index}/_create/{id}`, `GET|HEAD|DELETE /{index}/_doc/{id}`, `GET /{index}/_source/{id}`, `POST /{index}/_update/{id}` (`doc`, `doc_as_upsert`, `upsert`, `detect_noop`), `POST /_mget`, `POST /{index}/_mget`
- `POST /_bulk`, `PUT|POST /{index}/_bulk` with `index`, `create`, `update`, `delete` and per-item errors; missing indices are created on first write
- `GET|POST /_search`, `/{index}/_search` (comma lists and `*` patterns), `GET|POST /_count`, `/{index}/_count`, `POST /{index}/_delete_by_query`
- Query params: `size`, `from`, `q`, `df`, `default_operator`, `track_total_hits`, `_source`, `sort`, `op_type`; `refresh`, `timeout`, `routing`, `pretty`, `filter_path` and friends are accepted and ignored

### Search body

`query`, `from`, `size`, `sort`, `search_after`, `track_total_hits` (true / false / number), `track_scores`, `_source` (boolean, string, array, `{ includes, excludes }` with `*` wildcards), `aggs` / `aggregations`, `min_score`, `version`, `seq_no_primary_term`, `timeout`, `explain: false`, `stored_fields: '_none_'`.

### Mappings

Field types `keyword`, `text` (with `fields` multi-fields), `long`, `integer`, `short`, `byte`, `double`, `float`, `half_float`, `scaled_float`, `boolean`, `date`, `ip`, `object`, `nested`. Options `analyzer`, `search_analyzer`, `normalizer`, `format` (`strict_date_optional_time`, `date_optional_time`, `epoch_millis`, `epoch_second`, combined with `||`), `ignore_above`, `null_value`, `copy_to`, `dynamic` (`true`, `false`, `strict`) at root and object level. Harmless options such as `index`, `doc_values`, `store`, `norms`, `boost` are accepted and ignored.

Dynamic mapping follows OpenSearch defaults: strings become `text` with a `keyword` sub-field (`ignore_above: 256`), ISO dates become `date`, integers `long`, floats `float`, arrays take the type of their first element and arrays of objects become `object`, not `nested`. Numeric strings and `"true"`/`"false"` are coerced; anything else is a `mapper_parsing_exception`.

### Analysis

Built-in analyzers `standard`, `simple`, `whitespace`, `keyword`, `english`. Custom analyzers built from tokenizers `standard`, `letter`, `lowercase`, `whitespace`, `keyword`, `edge_ngram`, `ngram` and filters `lowercase`, `uppercase`, `asciifolding`, `trim`, `stop`, `stemmer` (English), `porter_stem`, `edge_ngram`, `ngram`. Normalizers built from `lowercase`, `uppercase`, `trim`, `asciifolding`.

### Query DSL

`match_all`, `match_none`, `ids`, `exists`, `term`, `terms` (array form), `range` (numbers, dates, `now`, date math with `y M w d h H m s` and `/unit` rounding, `format`), `prefix`, `wildcard`, `regexp`, `fuzzy`, `match` (`operator`, `fuzziness`, `prefix_length`, `fuzzy_transpositions`, `minimum_should_match`, `zero_terms_query`, `lenient`), `match_phrase` (`slop`), `match_phrase_prefix`, `match_bool_prefix`, `multi_match` (`best_fields`, `most_fields`, `phrase`, `phrase_prefix`, `^boost` and `*` field patterns), `bool`, `constant_score`, `dis_max`, `nested`, `query_string` and `simple_query_string` (terms, phrases, `field:value`, `AND` / `OR` / `NOT` / `+` / `-`, grouping, `*` and `?` wildcards, `~` fuzziness, ranges, `_exists_`, `fields`, `default_field`, `default_operator`, `allow_leading_wildcard`, `analyze_wildcard`, `lenient`).

Scoring is BM25 (k1 1.2, b 0.75). `filter`, `must_not` and `constant_score` do not score.

### Sort

Strings, objects and arrays of `field`, `{ field: order }`, `{ field: { order, missing, mode, unmapped_type } }`, `_score`, `_doc`. Hits carry `sort` values in OpenSearch's shapes so `search_after` cursors round-trip. Sorting on a `text` field fails like the real thing.

### Aggregations

Metrics `min`, `max`, `sum`, `avg`, `value_count`, `cardinality`, `stats` (with `missing`). Buckets `terms` (`size`, `order`, `min_doc_count`, `missing`, `include` / `exclude` arrays), `filter`, `filters`, `range`, `date_range`, `histogram`, `date_histogram` (`fixed_interval`, `calendar_interval`), `nested`, `reverse_nested`, `global`, `top_hits`. Sub-aggregations under bucket aggregations.

## Rejected (400 with the feature named)

- Queries: `function_score`, `script`, `script_score`, `more_like_this`, `percolate`, `knn`, `neural`, `rank_feature`, `pinned`, `has_child`, `has_parent`, `boosting`, `intervals`, `wrapper`, `terms_set`, `span_*`, `geo_*`, the terms lookup form, `multi_match` types `cross_fields` and `bool_prefix`, `range` `relation` and `time_zone`
- Search body: `highlight`, `suggest`, `collapse`, `script_fields`, `runtime_mappings`, `knn`, `post_filter`, `rescore`, `explain: true`, `profile: true`, `terminate_after`, scroll and PIT
- Aggregations: `percentiles`, `composite`, `significant_terms`, `multi_terms`, `sampler`, `geo*`, pipeline aggregations, scripts, regex `include` / `exclude`, `time_zone`
- Mappings: `geo_point`, `knn_vector`, `completion`, `join`, `flat_object`, `alias`, `dynamic_templates`, other date formats, other analyzers and token filters, `char_filter`
- Sort: `_geo_distance`, `nested` sort options
- Index creation with aliases, unknown index settings (for example `index.knn`, `index.sort`), scripted updates, other `_cat` formats

## Known simplifications

- Writes are visible immediately; `refresh` is accepted but has no effect.
- `cardinality` is exact rather than HyperLogLog-approximate.
- The `english` analyzer and `stemmer` filter use a compact Porter stemmer that is close to, but not byte-identical with, Lucene's.
- The `standard` tokenizer approximates Unicode word segmentation with a regular expression.
- BM25 scores are computed per field over the whole index and are not byte-identical with OpenSearch's per-shard scores; ordering is comparable.
- `long` values are stored as JavaScript numbers, so precision is lost above 2^53.
- Missing numeric sort values are emitted as the Long sentinels OpenSearch uses, which JSON rounds to `±9223372036854776000`.
- Bulk `delete` on a missing index reports `not_found` instead of creating the index.
- The `_source` field is always stored and `_routing` is ignored.
