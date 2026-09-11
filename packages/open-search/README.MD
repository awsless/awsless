### Local testing

`mockOpenSearch()` boots an in-memory OpenSearch server from `@awsless/open-search-server`, so tests need no JDK, no download & no network. It covers the basics (index lifecycle, document CRUD, bulk, the common query clauses, sorting & a few aggregations) & rejects anything else with a clear error instead of guessing.

The real distribution stays available as an opt-in engine, which needs a local JDK 21+ on macOS:

```ts
mockOpenSearch({ engine: 'opensearch' })
```
