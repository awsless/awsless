Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let node_net = require("node:net");
let crypto = require("crypto");
let fs_promises = require("fs/promises");
let path = require("path");
let decompress = require("decompress");
decompress = __toESM(decompress, 1);
let find_cache_directory = require("find-cache-directory");
find_cache_directory = __toESM(find_cache_directory, 1);
let child_process = require("child_process");
let util = require("util");
let node_http = require("node:http");
let node_crypto = require("node:crypto");
//#region src/opensearch/download.ts
const getArchiveName = (version) => {
	const name = `opensearch-min-${version}`;
	switch (process.platform) {
		case "win32": return `${name}-windows-arm64.zip`;
		default: return `${name}-linux-x64.tar.gz`;
	}
};
const getDownloadUrl = (version) => {
	return `https://artifacts.opensearch.org/releases/core/opensearch/${version}/${getArchiveName(version)}`;
};
const getDownloadPath = () => {
	return (0, path.resolve)((0, find_cache_directory.default)({
		name: "@awsless/open-search",
		cwd: process.cwd()
	}) || "");
};
const exists$1 = async (path$3) => {
	try {
		await (0, fs_promises.stat)(path$3);
	} catch {
		return false;
	}
	return true;
};
const download = async ({ version }) => {
	const path$4 = (0, path.join)(getDownloadPath(), "min");
	const name = `opensearch-${version}`;
	const file = (0, path.join)(path$4, name);
	if (await exists$1(file)) return file;
	console.log(`Downloading OpenSearch ${version}`);
	const url = getDownloadUrl(version);
	const response = await fetch(url, { method: "GET" });
	if (!response.ok) throw new Error(`Downloading OpenSearch failed with status ${response.status}: ${url}`);
	const data = await response.arrayBuffer();
	const buffer = Buffer.from(data);
	const checksumResponse = await fetch(`${url}.sha512`, { method: "GET" });
	if (!checksumResponse.ok) throw new Error(`Downloading the OpenSearch checksum failed with status ${checksumResponse.status}: ${url}.sha512`);
	const checksum = (await checksumResponse.text()).split(/\s+/)[0];
	if ((0, crypto.createHash)("sha512").update(buffer).digest("hex") !== checksum) throw new Error(`The OpenSearch archive doesn't match its published sha512 checksum: ${url}`);
	const staging = (0, path.join)(path$4, `staging-${process.pid}`);
	await (0, fs_promises.mkdir)(staging, {
		recursive: true,
		mode: "0777"
	});
	await (0, decompress.default)(buffer, staging);
	try {
		await (0, fs_promises.rename)((0, path.join)(staging, name), file);
	} catch (error) {
		if (!await exists$1(file)) throw error;
	}
	await (0, fs_promises.rm)(staging, {
		recursive: true,
		force: true
	});
	return file;
};
//#endregion
//#region src/opensearch/java.ts
const exec = (0, util.promisify)(child_process.execFile);
const MINIMUM_JAVA_VERSION = 21;
const getJavaVersion = async (home) => {
	try {
		const result = await exec((0, path.join)(home, "bin/java"), ["-version"]);
		const match = `${result.stdout}${result.stderr}`.match(/version "(\d+)/);
		if (match) return Number(match[1]);
	} catch {}
};
const getMacJavaHome = async () => {
	try {
		return (await exec("/usr/libexec/java_home", ["-v", `${MINIMUM_JAVA_VERSION}+`])).stdout.trim() || void 0;
	} catch {}
};
const findJavaHome = async () => {
	const candidates = [
		process.env.OPENSEARCH_JAVA_HOME,
		process.env.JAVA_HOME,
		process.platform === "darwin" ? await getMacJavaHome() : void 0,
		"/opt/homebrew/opt/openjdk",
		"/opt/homebrew/opt/openjdk@21",
		"/usr/local/opt/openjdk",
		"/usr/local/opt/openjdk@21"
	];
	for (const home of candidates) {
		if (!home) continue;
		const version = await getJavaVersion(home);
		if (version && version >= MINIMUM_JAVA_VERSION) return home;
	}
};
//#endregion
//#region src/opensearch/launch.ts
const exists = async (path$1) => {
	try {
		await (0, fs_promises.stat)(path$1);
	} catch {
		return false;
	}
	return true;
};
const parseSettings = (settings) => {
	return Object.entries(settings).map(([key, value]) => {
		return ["-E", `${key}=${value}`];
	}).flat();
};
const launch = async ({ path: path$2, host, port, version, debug, onExit: onDied, onOutput }) => {
	const cache = (0, path.join)(path$2, "cache", String(port));
	const cleanUp = async () => {
		if (await exists(cache)) await (0, fs_promises.rm)(cache, { recursive: true });
	};
	await cleanUp();
	const binary = (0, path.join)(path$2, "bin/opensearch");
	const env = { ...process.env };
	if (process.platform === "darwin") {
		const javaHome = await findJavaHome();
		if (!javaHome) throw new Error("No local JDK 21+ found to run OpenSearch. Install one with \"brew install openjdk\".");
		env.OPENSEARCH_JAVA_HOME = javaHome;
	}
	return new Promise((resolve, reject) => {
		const child = (0, child_process.spawn)(binary, parseSettings(version.settings({
			host,
			port,
			cache
		})), { env });
		const output = [];
		const onError = (error) => void fail(error);
		const onExit = (code) => {
			fail(`OpenSearch exited before starting (code ${code})\n${output.join("")}`);
		};
		const onMessage = (message) => {
			const line = message.toString("utf8").toLowerCase();
			output.push(line);
			if (debug) console.log(line);
			if (version.started(line)) done();
		};
		let stopping = false;
		const kill = async () => {
			stopping = true;
			if (child.exitCode === null && !child.killed) await new Promise((resolve) => {
				child.once(`exit`, () => {
					resolve(void 0);
				});
				child.kill();
			});
			await cleanUp();
		};
		process.on("beforeExit", async () => {
			off();
			await kill();
		});
		const off = () => {
			child.stderr.off("data", onMessage);
			child.stdout.off("data", onMessage);
			child.off("error", onError);
			child.off("exit", onExit);
		};
		const on = () => {
			child.stderr.on("data", onMessage);
			child.stdout.on("data", onMessage);
			child.on("error", onError);
			child.on("exit", onExit);
		};
		const done = () => {
			off();
			child.once("exit", (code, signal) => {
				if (!stopping) onDied?.(code, signal);
			});
			if (onOutput) {
				const capture = (chunk) => {
					for (const line of chunk.toString().split("\n")) if (line.trim() !== "") onOutput(line);
				};
				child.stdout.on("data", capture);
				child.stderr.on("data", capture);
			}
			resolve(kill);
		};
		const fail = async (error) => {
			off();
			await kill();
			reject(new Error(error));
		};
		on();
	});
};
//#endregion
//#region src/opensearch/version.ts
const VERSION_3_5_0_MIN = {
	version: "3.5.0",
	started: (line) => line.includes("o.o.n.node") && line.includes("started"),
	settings: ({ port, host, cache }) => ({
		"discovery.type": "single-node",
		"http.host": host,
		"http.port": port,
		"path.data": `${cache}/data`,
		"path.logs": `${cache}/logs`,
		"cluster.routing.allocation.disk.threshold_enabled": "false"
	})
};
//#endregion
//#region src/opensearch/real-server.ts
const findFreePort = () => new Promise((resolve, reject) => {
	const server = (0, node_net.createServer)();
	server.once("error", reject);
	server.listen(0, "127.0.0.1", () => {
		const port = server.address().port;
		server.close(() => resolve(port));
	});
});
var RealOpenSearchServer = class {
	host;
	options;
	kill;
	boundPort = 0;
	constructor(options = {}) {
		this.host = options.host ?? "localhost";
		this.options = options;
	}
	get port() {
		return this.boundPort;
	}
	get endpoint() {
		return `http://${this.host}:${this.boundPort}`;
	}
	async listen(port = this.options.port ?? 0) {
		if (this.kill) throw new Error("The OpenSearch server is already listening");
		const version = this.options.version ?? VERSION_3_5_0_MIN;
		const path = await download(version);
		const boundPort = port || await findFreePort();
		this.kill = await launch({
			path,
			port: boundPort,
			host: this.host,
			version,
			debug: this.options.debug,
			onExit: this.options.onExit,
			onOutput: this.options.onOutput
		});
		this.boundPort = boundPort;
		await this.waitForReady(6e4);
	}
	async close() {
		const kill = this.kill;
		if (!kill) return;
		this.kill = void 0;
		this.boundPort = 0;
		await kill();
	}
	async reset() {
		if (!this.kill) return;
		const result = await fetch(`${this.endpoint}/_all`, { method: "DELETE" });
		if (!result.ok) throw new Error(`Resetting the OpenSearch server failed: ${await result.text()}`);
	}
	async waitForReady(timeoutMs) {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			try {
				if ((await fetch(this.endpoint)).ok) return;
			} catch {}
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		throw new Error("The local OpenSearch server never became ready.");
	}
};
//#endregion
//#region src/errors.ts
var OpenSearchError = class extends Error {
	type;
	status;
	reason;
	rootCause;
	extra;
	constructor(type, status, reason, options = {}) {
		super(`${type}: ${reason}`);
		this.name = "OpenSearchError";
		this.type = type;
		this.status = status;
		this.reason = reason;
		this.rootCause = options.rootCause ?? {
			type,
			reason
		};
		this.extra = options.extra ?? {};
	}
	toBody() {
		return {
			error: {
				root_cause: [this.rootCause],
				type: this.type,
				reason: this.reason,
				...this.extra
			},
			status: this.status
		};
	}
};
const unsupported = (what) => {
	return new OpenSearchError("illegal_argument_exception", 400, `The local OpenSearch server does not support ${what}.`);
};
const indexNotFound = (index) => {
	return new OpenSearchError("index_not_found_exception", 404, `no such index [${index}]`, { extra: {
		index,
		"resource.type": "index_or_alias",
		"resource.id": index,
		index_uuid: "_na_"
	} });
};
const indexExists = (index) => {
	return new OpenSearchError("resource_already_exists_exception", 400, `index [${index}/local] already exists`, { extra: { index } });
};
const documentMissing = (index, id) => {
	return new OpenSearchError("document_missing_exception", 404, `[${id}]: document missing`, { extra: {
		index,
		shard: "0"
	} });
};
const versionConflict = (index, id) => {
	return new OpenSearchError("version_conflict_engine_exception", 409, `[${id}]: version conflict, document already exists (current version [1])`, { extra: {
		index,
		shard: "0"
	} });
};
const illegalArgument = (reason) => {
	return new OpenSearchError("illegal_argument_exception", 400, reason);
};
const parsingError = (reason) => {
	return new OpenSearchError("parsing_exception", 400, reason);
};
const mapperParsing = (reason) => {
	return new OpenSearchError("mapper_parsing_exception", 400, reason);
};
const strictDynamic = (field, parent = "_doc") => {
	return new OpenSearchError("strict_dynamic_mapping_exception", 400, `mapping set to strict, dynamic introduction of [${field}] within [${parent}] is not allowed`);
};
const queryShard = (reason) => {
	return new OpenSearchError("query_shard_exception", 400, reason);
};
const wrapSearchError = (error, index) => {
	if (!(error instanceof OpenSearchError)) throw error;
	if (error.type === "search_phase_execution_exception") return error;
	const cause = {
		type: error.type,
		reason: error.reason
	};
	return new OpenSearchError("search_phase_execution_exception", error.status, error.reason, {
		rootCause: cause,
		extra: {
			phase: "query",
			grouped: true,
			failed_shards: [{
				shard: 0,
				index,
				node: "local",
				reason: cause
			}],
			caused_by: cause
		}
	});
};
//#endregion
//#region src/engine/analysis.ts
const ENGLISH_STOP_WORDS = /* @__PURE__ */ new Set([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"but",
	"by",
	"for",
	"if",
	"in",
	"into",
	"is",
	"it",
	"no",
	"not",
	"of",
	"on",
	"or",
	"such",
	"that",
	"the",
	"their",
	"then",
	"there",
	"these",
	"they",
	"this",
	"to",
	"was",
	"will",
	"with"
]);
const porterStem = (word) => {
	if (word.length < 3) return word;
	const c = "[^aeiou]";
	const v = "[aeiouy]";
	const C = `${c}[^aeiouy]*`;
	const V = `${v}[aeiou]*`;
	const mgr0 = new RegExp(`^(${C})?${V}${C}`);
	const meq1 = new RegExp(`^(${C})?${V}${C}(${V})?$`);
	const mgr1 = new RegExp(`^(${C})?${V}${C}${V}${C}`);
	const hasVowel = new RegExp(`^(${C})?${v}`);
	let w = word;
	const first = w[0];
	if (first === "y") w = `Y${w.slice(1)}`;
	if (/(ss|i)es$/.test(w)) w = w.replace(/(ss|i)es$/, "$1");
	else if (/([^s])s$/.test(w)) w = w.replace(/([^s])s$/, "$1");
	if (w.endsWith("eed")) {
		const stem = w.replace(/eed$/, "");
		if (mgr0.test(stem)) w = `${stem}ee`;
	} else {
		const match = /^(.+?)(ed|ing)$/.exec(w);
		if (match && hasVowel.test(match[1])) {
			w = match[1];
			if (/(at|bl|iz)$/.test(w)) w = `${w}e`;
			else if (/([^aeiouylsz])\1$/.test(w)) w = w.slice(0, -1);
			else if (new RegExp(`^${C}${v}[^aeiouwxy]$`).test(w)) w = `${w}e`;
		}
	}
	{
		const match = /^(.+?)y$/.exec(w);
		if (match && hasVowel.test(match[1])) w = `${match[1]}i`;
	}
	const step2 = {
		ational: "ate",
		tional: "tion",
		enci: "ence",
		anci: "ance",
		izer: "ize",
		bli: "ble",
		alli: "al",
		entli: "ent",
		eli: "e",
		ousli: "ous",
		ization: "ize",
		ation: "ate",
		ator: "ate",
		alism: "al",
		iveness: "ive",
		fulness: "ful",
		ousness: "ous",
		aliti: "al",
		iviti: "ive",
		biliti: "ble",
		logi: "log"
	};
	{
		const match = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/.exec(w);
		if (match && mgr0.test(match[1])) w = match[1] + step2[match[2]];
	}
	const step3 = {
		icate: "ic",
		ative: "",
		alize: "al",
		iciti: "ic",
		ical: "ic",
		ful: "",
		ness: ""
	};
	{
		const match = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/.exec(w);
		if (match && mgr0.test(match[1])) w = match[1] + step3[match[2]];
	}
	{
		const match = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/.exec(w);
		if (match && mgr1.test(match[1])) w = match[1];
		else {
			const ion = /^(.+?)(s|t)(ion)$/.exec(w);
			if (ion && mgr1.test(ion[1] + ion[2])) w = ion[1] + ion[2];
		}
	}
	{
		const match = /^(.+?)e$/.exec(w);
		if (match) {
			const stem = match[1];
			if (mgr1.test(stem) || meq1.test(stem) && !new RegExp(`^${C}${v}[^aeiouwxy]$`).test(stem)) w = stem;
		}
	}
	if (w.endsWith("ll") && mgr1.test(w)) w = w.slice(0, -1);
	if (first === "y") w = `y${w.slice(1)}`;
	return w;
};
const standardTokenizer = (text) => {
	return text.match(/[\p{L}\p{N}_]+(?:['’.:][\p{L}\p{N}_]+)*/gu) ?? [];
};
const letterTokenizer = (text) => text.match(/\p{L}+/gu) ?? [];
const whitespaceTokenizer = (text) => text.split(/\s+/).filter(Boolean);
const keywordTokenizer = (text) => [text];
const lowercase = (tokens) => tokens.map((t) => t.toLowerCase());
const uppercase = (tokens) => tokens.map((t) => t.toUpperCase());
const trim = (tokens) => tokens.map((t) => t.trim());
const asciifolding = (tokens) => tokens.map(foldAscii);
const englishPossessive = (tokens) => tokens.map((t) => t.replace(/['’]s$/i, ""));
const porter = (tokens) => tokens.map(porterStem);
const foldAscii = (text) => text.normalize("NFD").replace(/\p{M}+/gu, "");
const stopFilter = (words) => {
	return (tokens) => tokens.filter((t) => !words.has(t));
};
const ngramFilter = (min, max, edge) => {
	return (tokens) => {
		const out = [];
		for (const token of tokens) for (let start = 0; start < (edge ? 1 : token.length); start++) for (let size = min; size <= max && start + size <= token.length; size++) out.push(token.slice(start, start + size));
		return out;
	};
};
const compose = (tokenizer, filters) => {
	return (text) => filters.reduce((tokens, filter) => filter(tokens), tokenizer(text)).filter((t) => t.length > 0);
};
const BUILTIN_ANALYZERS = {
	standard: compose(standardTokenizer, [lowercase]),
	simple: compose(letterTokenizer, [lowercase]),
	whitespace: compose(whitespaceTokenizer, []),
	keyword: compose(keywordTokenizer, []),
	english: compose(standardTokenizer, [
		englishPossessive,
		lowercase,
		stopFilter(ENGLISH_STOP_WORDS),
		porter
	])
};
const BUILTIN_TOKENIZERS = {
	standard: standardTokenizer,
	letter: letterTokenizer,
	lowercase: (text) => lowercase(letterTokenizer(text)),
	whitespace: whitespaceTokenizer,
	keyword: keywordTokenizer
};
const BUILTIN_FILTERS = {
	lowercase,
	uppercase,
	trim,
	asciifolding,
	stop: stopFilter(ENGLISH_STOP_WORDS),
	porter_stem: porter,
	stemmer: porter,
	kstem: porter
};
const BUILTIN_NORMALIZER_FILTERS = {
	lowercase,
	uppercase,
	trim,
	asciifolding
};
const asObject$2 = (value) => {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
};
const asStringList = (value) => {
	if (typeof value === "string") return [value];
	if (Array.isArray(value) && value.every((v) => typeof v === "string")) return value;
	return [];
};
const stopWordsFrom = (value) => {
	if (value === void 0 || value === "_english_") return ENGLISH_STOP_WORDS;
	if (value === "_none_") return /* @__PURE__ */ new Set();
	if (Array.isArray(value)) return new Set(asStringList(value));
	throw unsupported(`the stopwords setting "${String(value)}"`);
};
const buildAnalysis = (analysis) => {
	const settings = asObject$2(analysis) ?? {};
	const filters = { ...BUILTIN_FILTERS };
	const analyzers = { ...BUILTIN_ANALYZERS };
	const normalizers = {};
	for (const key of Object.keys(settings)) if (![
		"analyzer",
		"filter",
		"normalizer",
		"tokenizer",
		"char_filter"
	].includes(key)) throw unsupported(`the analysis setting "${key}"`);
	if (settings.char_filter && Object.keys(asObject$2(settings.char_filter) ?? {}).length > 0) throw unsupported("custom char_filter definitions");
	const tokenizers = { ...BUILTIN_TOKENIZERS };
	for (const [name, def] of Object.entries(asObject$2(settings.tokenizer) ?? {})) {
		const config = asObject$2(def) ?? {};
		const type = String(config.type);
		if (type === "edge_ngram" || type === "ngram") {
			const min = Number(config.min_gram ?? 1);
			const max = Number(config.max_gram ?? 2);
			const gram = ngramFilter(min, max, type === "edge_ngram");
			tokenizers[name] = (text) => gram([text]);
		} else if (BUILTIN_TOKENIZERS[type]) tokenizers[name] = BUILTIN_TOKENIZERS[type];
		else throw unsupported(`the "${type}" tokenizer`);
	}
	for (const [name, def] of Object.entries(asObject$2(settings.filter) ?? {})) {
		const config = asObject$2(def) ?? {};
		const type = String(config.type);
		if (type === "edge_ngram" || type === "ngram") filters[name] = ngramFilter(Number(config.min_gram ?? 1), Number(config.max_gram ?? 2), type === "edge_ngram");
		else if (type === "stop") filters[name] = stopFilter(stopWordsFrom(config.stopwords));
		else if (type === "stemmer") {
			const language = config.language ?? config.name ?? "english";
			if (language !== "english" && language !== "porter" && language !== "light_english") throw unsupported(`the "${String(language)}" stemmer`);
			filters[name] = porter;
		} else if (BUILTIN_FILTERS[type]) filters[name] = BUILTIN_FILTERS[type];
		else throw unsupported(`the "${type}" token filter`);
	}
	for (const [name, def] of Object.entries(asObject$2(settings.analyzer) ?? {})) {
		const config = asObject$2(def) ?? {};
		const type = String(config.type ?? "custom");
		if (type === "custom") {
			if (asStringList(config.char_filter).length > 0) throw unsupported("char_filter in custom analyzers");
			const tokenizerName = String(config.tokenizer ?? "standard");
			const tokenizer = tokenizers[tokenizerName];
			if (!tokenizer) throw unsupported(`the "${tokenizerName}" tokenizer`);
			const chain = asStringList(config.filter).map((filterName) => {
				const filter = filters[filterName];
				if (!filter) throw unsupported(`the "${filterName}" token filter`);
				return filter;
			});
			analyzers[name] = compose(tokenizer, chain);
		} else if (type === "standard") analyzers[name] = compose(standardTokenizer, [lowercase, stopFilter(stopWordsFrom(config.stopwords ?? "_none_"))]);
		else if (type === "stop") analyzers[name] = compose(letterTokenizer, [lowercase, stopFilter(stopWordsFrom(config.stopwords))]);
		else if (BUILTIN_ANALYZERS[type]) analyzers[name] = BUILTIN_ANALYZERS[type];
		else throw unsupported(`the "${type}" analyzer`);
	}
	for (const [name, def] of Object.entries(asObject$2(settings.normalizer) ?? {})) {
		const config = asObject$2(def) ?? {};
		if (asStringList(config.char_filter).length > 0) throw unsupported("char_filter in normalizers");
		const chain = asStringList(config.filter).map((filterName) => {
			const filter = BUILTIN_NORMALIZER_FILTERS[filterName];
			if (!filter) throw unsupported(`the "${filterName}" normalizer filter`);
			return filter;
		});
		normalizers[name] = (text) => chain.reduce((tokens, filter) => filter(tokens), [text])[0] ?? "";
	}
	return {
		hasAnalyzer: (name) => name in analyzers,
		hasNormalizer: (name) => name in normalizers,
		analyzer: (name) => {
			const analyzer = analyzers[name];
			if (!analyzer) throw illegalArgument(`analyzer [${name}] has not been configured in mappings`);
			return analyzer;
		},
		normalizer: (name) => {
			const normalizer = normalizers[name];
			if (!normalizer) throw illegalArgument(`normalizer [${name}] has not been configured in mappings`);
			return normalizer;
		}
	};
};
//#endregion
//#region src/engine/dates.ts
const ISO_FORMATS = /* @__PURE__ */ new Set([
	"strict_date_optional_time",
	"date_optional_time",
	"strict_date_time",
	"date_time"
]);
const parseDateFormat = (format) => {
	const parts = (format ?? "strict_date_optional_time||epoch_millis").split("||").map((p) => p.trim());
	const result = {
		iso: false,
		epochMillis: false,
		epochSecond: false
	};
	for (const part of parts) if (ISO_FORMATS.has(part)) result.iso = true;
	else if (part === "epoch_millis") result.epochMillis = true;
	else if (part === "epoch_second") result.epochSecond = true;
	else throw unsupported(`the date format "${part}"`);
	return result;
};
const ISO_PATTERN = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:[T ](\d{2})(?::(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;
const parseIsoDate = (text) => {
	const match = ISO_PATTERN.exec(text);
	if (!match) return void 0;
	const [, year, month, day, hour, minute, second, fraction, zone] = match;
	const millis = fraction ? Number(fraction.padEnd(3, "0").slice(0, 3)) : 0;
	const time = Date.UTC(Number(year), Number(month) - 1, Number(day ?? "1"), Number(hour ?? "0"), Number(minute ?? "0"), Number(second ?? "0"), millis);
	if (Number.isNaN(time)) return void 0;
	if (!zone || zone === "Z") return time;
	const sign = zone.startsWith("-") ? -1 : 1;
	const digits = zone.slice(1).replace(":", "");
	return time - sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || "0")) * 6e4;
};
const isIsoDate = (text) => ISO_PATTERN.test(text) && parseIsoDate(text) !== void 0;
const parseDateValue = (value, format) => {
	if (typeof value === "number") {
		if (format.epochSecond && !format.epochMillis) return value * 1e3;
		return value;
	}
	if (typeof value !== "string") return void 0;
	if (format.iso) {
		const time = parseIsoDate(value);
		if (time !== void 0) return time;
	}
	if ((format.epochMillis || format.epochSecond) && /^-?\d+$/.test(value)) {
		const number = Number(value);
		return format.epochMillis ? number : number * 1e3;
	}
};
const formatDate = (millis) => new Date(millis).toISOString();
const UNIT_ALIASES = {
	y: "y",
	M: "M",
	w: "w",
	d: "d",
	h: "h",
	H: "h",
	m: "m",
	s: "s"
};
const addUnit = (time, amount, unit) => {
	const date = new Date(time);
	switch (unit) {
		case "y":
			date.setUTCFullYear(date.getUTCFullYear() + amount);
			return date.getTime();
		case "M":
			date.setUTCMonth(date.getUTCMonth() + amount);
			return date.getTime();
		case "w": return time + amount * 7 * 864e5;
		case "d": return time + amount * 864e5;
		case "h": return time + amount * 36e5;
		case "m": return time + amount * 6e4;
		case "s": return time + amount * 1e3;
	}
};
const roundDownTo = (time, unit) => {
	const date = new Date(time);
	switch (unit) {
		case "y": return Date.UTC(date.getUTCFullYear(), 0, 1);
		case "M": return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
		case "w": return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - (date.getUTCDay() + 6) % 7 * 864e5;
		case "d": return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
		case "h": return time - time % 36e5;
		case "m": return time - time % 6e4;
		case "s": return time - time % 1e3;
	}
};
const roundUpTo = (time, unit) => addUnit(roundDownTo(time, unit), 1, unit) - 1;
const MATH_PATTERN = /^([+-])(\d+)([yMwdhHms])|^\/([yMwdhHms])/;
const parseDateMath = (text, format, roundUp, now) => {
	let rest;
	let time;
	if (text.startsWith("now")) {
		time = now;
		rest = text.slice(3);
	} else {
		const split = text.indexOf("||");
		const anchor = split === -1 ? text : text.slice(0, split);
		rest = split === -1 ? "" : text.slice(split + 2);
		const parsed = parseDateValue(anchor, format);
		if (parsed === void 0) throw parsingError(`failed to parse date field [${text}] with format [${formatName(format)}]`);
		time = parsed;
	}
	while (rest.length > 0) {
		const match = MATH_PATTERN.exec(rest);
		if (!match) throw illegalArgument(`operator not supported for date math [${text}]`);
		rest = rest.slice(match[0].length);
		if (match[4]) {
			const unit = UNIT_ALIASES[match[4]];
			time = roundUp ? roundUpTo(time, unit) : roundDownTo(time, unit);
		} else {
			const amount = Number(match[2]) * (match[1] === "-" ? -1 : 1);
			time = addUnit(time, amount, UNIT_ALIASES[match[3]]);
		}
	}
	return time;
};
const formatName = (format) => {
	const parts = [];
	if (format.iso) parts.push("strict_date_optional_time");
	if (format.epochMillis) parts.push("epoch_millis");
	if (format.epochSecond) parts.push("epoch_second");
	return parts.join("||");
};
const FIXED_UNITS = {
	ms: 1,
	s: 1e3,
	m: 6e4,
	h: 36e5,
	d: 864e5
};
const CALENDAR_UNITS = {
	minute: "m",
	"1m": "m",
	hour: "h",
	"1h": "h",
	day: "d",
	"1d": "d",
	week: "w",
	"1w": "w",
	month: "M",
	"1M": "M",
	quarter: "q",
	"1q": "q",
	year: "y",
	"1y": "y"
};
const parseFixedInterval = (text) => {
	const match = /^(\d+)(ms|s|m|h|d)$/.exec(text);
	if (!match) throw illegalArgument(`failed to parse setting [fixed_interval] with value [${text}]`);
	return Number(match[1]) * FIXED_UNITS[match[2]];
};
const parseCalendarInterval = (text) => {
	const unit = CALENDAR_UNITS[text];
	if (!unit) throw illegalArgument(`The supplied interval [${text}] could not be parsed as a calendar interval.`);
	return unit;
};
const roundToInterval = (time, interval) => {
	if (interval.fixed !== void 0) return Math.floor(time / interval.fixed) * interval.fixed;
	if (interval.calendar === "q") {
		const date = new Date(time);
		return Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1);
	}
	return roundDownTo(time, interval.calendar);
};
const nextInterval = (time, interval) => {
	if (interval.fixed !== void 0) return time + interval.fixed;
	if (interval.calendar === "q") return addUnit(time, 3, "M");
	return addUnit(time, 1, interval.calendar);
};
//#endregion
//#region src/engine/source.ts
const isPlainObject = (value) => {
	return value !== null && typeof value === "object" && !Array.isArray(value);
};
const deepEqual = (a, b) => {
	if (a === b) return true;
	if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
	if (isPlainObject(a) && isPlainObject(b)) {
		const keys = Object.keys(a);
		if (keys.length !== Object.keys(b).length) return false;
		return keys.every((key) => key in b && deepEqual(a[key], b[key]));
	}
	return false;
};
const deepMerge = (target, patch) => {
	const result = { ...target };
	for (const [key, value] of Object.entries(patch)) {
		const existing = result[key];
		result[key] = isPlainObject(existing) && isPlainObject(value) ? deepMerge(existing, value) : value;
	}
	return result;
};
const clone = (value) => structuredClone(value);
const parseSourceFilter = (value) => {
	if (value === void 0 || value === true) return void 0;
	if (value === false) return false;
	if (typeof value === "string") return {
		includes: [value],
		excludes: []
	};
	if (Array.isArray(value)) return {
		includes: value.map(String),
		excludes: []
	};
	if (isPlainObject(value)) {
		const list = (v) => v === void 0 ? [] : Array.isArray(v) ? v.map(String) : [String(v)];
		return {
			includes: list(value.includes ?? value.include),
			excludes: list(value.excludes ?? value.exclude)
		};
	}
	throw illegalArgument(`Unknown _source value [${String(value)}]`);
};
const segmentPattern = (pattern) => new RegExp(`^${pattern.split("*").map(escapeRegExp$3).join(".*")}$`);
const escapeRegExp$3 = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compilePatterns = (patterns) => patterns.map((p) => p.split(".").map(segmentPattern));
const prefixMatches = (pattern, path) => {
	return path.every((segment, i) => pattern[i]?.test(segment) ?? false);
};
const covers = (patterns, path) => {
	return patterns.some((p) => p.length <= path.length && prefixMatches(p, path.slice(0, p.length)));
};
const reaches = (patterns, path) => {
	return patterns.some((p) => p.length > path.length && prefixMatches(p, path));
};
const filterValue = (value, path, includes, excludes) => {
	if (Array.isArray(value)) return value.map((item) => filterValue(item, path, includes, excludes));
	if (!isPlainObject(value)) return value;
	const result = {};
	for (const [key, child] of Object.entries(value)) {
		const childPath = [...path, key];
		if (covers(excludes, childPath)) continue;
		const included = includes.length === 0 || covers(includes, childPath);
		const container = isPlainObject(child) || Array.isArray(child);
		if (included) result[key] = container && reaches(excludes, childPath) ? filterValue(child, childPath, [], excludes) : child;
		else if (container && reaches(includes, childPath)) result[key] = filterValue(child, childPath, includes, excludes);
	}
	return result;
};
const applySourceFilter = (source, filter) => {
	if (filter === false) return void 0;
	if (filter === void 0) return source;
	return filterValue(source, [], compilePatterns(filter.includes), compilePatterns(filter.excludes));
};
//#endregion
//#region src/engine/mapping.ts
const INTEGER_TYPES = /* @__PURE__ */ new Set([
	"long",
	"integer",
	"short",
	"byte"
]);
const FLOAT_TYPES = /* @__PURE__ */ new Set([
	"double",
	"float",
	"half_float",
	"scaled_float"
]);
const LEAF_TYPES = /* @__PURE__ */ new Set([
	"keyword",
	"text",
	"boolean",
	"date",
	"ip",
	...INTEGER_TYPES,
	...FLOAT_TYPES
]);
const isNumericType = (type) => INTEGER_TYPES.has(type) || FLOAT_TYPES.has(type);
const KNOWN_OPTIONS = /* @__PURE__ */ new Set([
	.../* @__PURE__ */ new Set([
		"index",
		"doc_values",
		"store",
		"norms",
		"similarity",
		"eager_global_ordinals",
		"boost",
		"coerce",
		"ignore_malformed",
		"scaling_factor",
		"fielddata",
		"index_options",
		"position_increment_gap",
		"term_vector",
		"meta",
		"split_queries_on_whitespace",
		"index_phrases",
		"index_prefixes",
		"enabled",
		"include_in_parent",
		"include_in_root"
	]),
	"type",
	"fields",
	"properties",
	"dynamic",
	"analyzer",
	"search_analyzer",
	"normalizer",
	"format",
	"ignore_above",
	"null_value",
	"copy_to"
]);
var TextValue = class {
	tokens;
	constructor(tokens) {
		this.tokens = tokens;
	}
};
const fieldTypeOf = (mapping) => {
	const type = mapping.type;
	if (type === void 0) return "object";
	if (type === "object" || type === "nested") return type;
	if (LEAF_TYPES.has(type)) return type;
	throw unsupported(`the "${type}" field type`);
};
const parseDynamic = (value, path) => {
	if (value === void 0) return void 0;
	if (value === true || value === "true") return true;
	if (value === false || value === "false") return false;
	if (value === "strict") return "strict";
	if (value === "runtime") throw unsupported("dynamic: \"runtime\" mappings");
	throw mapperParsing(`Failed to parse mapping [_doc]: Failed to parse [dynamic] on [${path}]: ${String(value)}`);
};
const validateField = (name, mapping, analysis, path) => {
	if (!isPlainObject(mapping)) throw mapperParsing(`Failed to parse mapping [_doc]: Expected map for property [fields] on field [${name}] but got a ${typeof mapping}`);
	const field = mapping;
	const type = fieldTypeOf(field);
	for (const key of Object.keys(field)) if (!KNOWN_OPTIONS.has(key)) {
		if (key === "dynamic_templates") throw unsupported("dynamic_templates");
		throw mapperParsing(`unknown parameter [${key}] on mapper [${name}] of type [${type}]`);
	}
	if (type === "object" || type === "nested") {
		parseDynamic(field.dynamic, path);
		if (field.properties !== void 0) {
			if (!isPlainObject(field.properties)) throw mapperParsing(`Failed to parse mapping [_doc]: Expected map for property [properties] on field [${name}]`);
			field.properties = validateProperties(field.properties, analysis, path);
		}
		if (field.fields !== void 0 || field.analyzer !== void 0 || field.format !== void 0) throw mapperParsing(`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters`);
		return field;
	}
	if (field.properties !== void 0 || field.dynamic !== void 0) throw mapperParsing(`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters: [properties]`);
	if (field.analyzer !== void 0 || field.search_analyzer !== void 0) {
		if (type !== "text") throw mapperParsing(`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters: [analyzer]`);
		for (const analyzer of [field.analyzer, field.search_analyzer]) if (analyzer !== void 0 && !analysis.hasAnalyzer(String(analyzer))) {
			if ([
				"standard",
				"simple",
				"whitespace",
				"keyword",
				"english"
			].includes(String(analyzer))) continue;
			throw unsupported(`the "${String(analyzer)}" analyzer`);
		}
	}
	if (field.normalizer !== void 0) {
		if (type !== "keyword") throw mapperParsing(`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters: [normalizer]`);
		if (!analysis.hasNormalizer(String(field.normalizer))) {
			if (String(field.normalizer) !== "lowercase") throw unsupported(`the "${String(field.normalizer)}" normalizer`);
		}
	}
	if (field.format !== void 0) {
		if (type !== "date") throw mapperParsing(`Failed to parse mapping [_doc]: Mapping definition for [${name}] has unsupported parameters: [format]`);
		parseDateFormat(String(field.format));
	}
	if (field.fields !== void 0) {
		if (!isPlainObject(field.fields)) throw mapperParsing(`Failed to parse mapping [_doc]: Expected map for property [fields] on field [${name}]`);
		const fields = {};
		for (const [subName, subMapping] of Object.entries(field.fields)) {
			const sub = validateField(subName, subMapping, analysis, `${path}.${subName}`);
			if (sub.type === void 0 || sub.type === "object" || sub.type === "nested" || sub.fields !== void 0) throw mapperParsing(`Failed to parse mapping [_doc]: Field [${subName}] cannot be a multi-field of type [${sub.type ?? "object"}]`);
			fields[subName] = sub;
		}
		field.fields = fields;
	}
	return field;
};
const validateProperties = (properties, analysis, path) => {
	const result = {};
	for (const [name, mapping] of Object.entries(properties)) {
		if (name.includes(".")) throw unsupported("dotted field names in mappings");
		result[name] = validateField(name, mapping, analysis, path ? `${path}.${name}` : name);
	}
	return result;
};
const validateRootMapping = (mapping, analysis) => {
	if (mapping === void 0) return { properties: {} };
	if (!isPlainObject(mapping)) throw mapperParsing("Failed to parse mapping [_doc]: mappings must be an object");
	const root = {};
	for (const [key, value] of Object.entries(mapping)) if (key === "properties") {
		if (!isPlainObject(value)) throw mapperParsing("Failed to parse mapping [_doc]: properties must be an object");
		root.properties = validateProperties(value, analysis, "");
	} else if (key === "dynamic") root.dynamic = parseDynamic(value, "_doc");
	else if (key === "_meta") root._meta = value;
	else if (key === "date_detection" || key === "numeric_detection") root[key] = value === true || value === "true";
	else if (key === "_source" || key === "_routing") {
		if ((isPlainObject(value) ? value.enabled : void 0) === false) throw unsupported(`disabling ${key}`);
	} else if (key === "dynamic_templates") throw unsupported("dynamic_templates");
	else if (key === "_doc") throw mapperParsing("Failed to parse mapping [_doc]: Root mapping definition has unsupported parameters: [_doc]");
	else throw unsupported(`the "${key}" root mapping setting`);
	root.properties ??= {};
	return root;
};
const mergeField = (name, existing, incoming) => {
	const existingType = fieldTypeOf(existing);
	const incomingType = fieldTypeOf(incoming);
	if (existingType !== incomingType) throw illegalArgument(`mapper [${name}] cannot be changed from type [${existingType}] to [${incomingType}]`);
	const merged = {
		...existing,
		...incoming
	};
	if (existing.properties || incoming.properties) merged.properties = mergeProperties(existing.properties ?? {}, incoming.properties ?? {});
	if (existing.fields || incoming.fields) merged.fields = mergeProperties(existing.fields ?? {}, incoming.fields ?? {});
	return merged;
};
const mergeProperties = (existing, incoming) => {
	const result = { ...existing };
	for (const [name, mapping] of Object.entries(incoming)) {
		const current = result[name];
		result[name] = current ? mergeField(name, current, mapping) : mapping;
	}
	return result;
};
const mergeRootMapping = (existing, incoming) => {
	return {
		...existing,
		...incoming,
		properties: mergeProperties(existing.properties ?? {}, incoming.properties ?? {})
	};
};
const resolveField = (root, path) => {
	const segments = path.split(".");
	let node = root;
	let nestedPath;
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		const last = i === segments.length - 1;
		const child = node.properties?.[segment];
		if (child) {
			node = child;
			if (fieldTypeOf(child) === "nested") nestedPath = segments.slice(0, i + 1).join(".");
			continue;
		}
		if (last && node !== root && node.fields?.[segment]) {
			node = node.fields[segment];
			continue;
		}
		return;
	}
	return {
		path,
		type: fieldTypeOf(node),
		mapping: node,
		nestedPath
	};
};
const listLeafFields = (root) => {
	const result = [];
	const walk = (node, path) => {
		for (const [name, child] of Object.entries(node.properties ?? {})) {
			const childPath = path ? `${path}.${name}` : name;
			const type = fieldTypeOf(child);
			if (type === "nested") continue;
			if (type === "object") {
				walk(child, childPath);
				continue;
			}
			result.push({
				path: childPath,
				type,
				mapping: child
			});
			for (const [subName, sub] of Object.entries(child.fields ?? {})) result.push({
				path: `${childPath}.${subName}`,
				type: fieldTypeOf(sub),
				mapping: sub
			});
		}
	};
	walk(root, "");
	return result;
};
const matchFieldPattern = (pattern, fields) => {
	if (!pattern.includes("*")) return fields.filter((f) => f.path === pattern);
	const regex = new RegExp(`^${pattern.split("*").map(escapeRegExp$2).join(".*")}$`);
	return fields.filter((f) => regex.test(f.path));
};
const escapeRegExp$2 = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dateFormatOf = (field) => {
	return parseDateFormat(field.mapping.format === void 0 ? void 0 : String(field.mapping.format));
};
const indexAnalyzerOf = (host, field) => {
	return host.analysis.analyzer(String(field.mapping.analyzer ?? "standard"));
};
const searchAnalyzerOf = (host, field) => {
	return host.analysis.analyzer(String(field.mapping.search_analyzer ?? field.mapping.analyzer ?? "standard"));
};
const normalizeKeyword = (host, field, value) => {
	const normalizer = field.mapping.normalizer;
	if (normalizer === void 0) return value;
	if (!host.analysis.hasNormalizer(String(normalizer)) && normalizer === "lowercase") return value.toLowerCase();
	return host.analysis.normalizer(String(normalizer))(value);
};
const preview = (value) => {
	const text = typeof value === "string" ? value : JSON.stringify(value);
	return text.length > 40 ? `${text.slice(0, 37)}...` : text;
};
const parseFailure = (path, type, value) => {
	return mapperParsing(`failed to parse field [${path}] of type [${type}] in document. Preview of field's value: '${preview(value)}'`);
};
const IP_PATTERN = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F:]+)$/;
const coerceLeafValue = (host, field, value) => {
	const { type, path } = field;
	if (value === null || value === void 0) {
		const nullValue = field.mapping.null_value;
		return nullValue === void 0 || nullValue === null ? void 0 : coerceLeafValue(host, field, nullValue);
	}
	if (isPlainObject(value)) throw mapperParsing(`object mapping for [${path}] tried to parse field [${path}] as object, but found a concrete value`);
	if (isNumericType(type)) {
		let number;
		if (typeof value === "number") number = value;
		else if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) number = Number(value);
		else throw parseFailure(path, type, value);
		if (!Number.isFinite(number)) throw parseFailure(path, type, value);
		return INTEGER_TYPES.has(type) ? Math.trunc(number) : number;
	}
	if (type === "boolean") {
		if (typeof value === "boolean") return value;
		if (value === "true") return true;
		if (value === "false" || value === "") return false;
		throw parseFailure(path, type, value);
	}
	if (type === "date") {
		if (typeof value === "boolean") throw parseFailure(path, type, value);
		const time = parseDateValue(value, dateFormatOf(field));
		if (time === void 0) throw parseFailure(path, type, value);
		return time;
	}
	if (type === "keyword") {
		const text = String(value);
		const ignoreAbove = field.mapping.ignore_above;
		if (typeof ignoreAbove === "number" && text.length > ignoreAbove) return void 0;
		return normalizeKeyword(host, field, text);
	}
	if (type === "text") return new TextValue(indexAnalyzerOf(host, field)(String(value)));
	if (type === "ip") {
		if (typeof value !== "string" || !IP_PATTERN.test(value)) throw parseFailure(path, type, value);
		return value;
	}
	throw parseFailure(path, type, value);
};
const guessType = (value, root) => {
	if (value === null || value === void 0) return void 0;
	if (typeof value === "boolean") return { type: "boolean" };
	if (typeof value === "number") return { type: Number.isInteger(value) ? "long" : "float" };
	if (typeof value === "string") {
		if (root.date_detection !== false && isIsoDate(value)) return { type: "date" };
		if (root.numeric_detection === true && /^-?\d+(\.\d+)?$/.test(value)) return { type: value.includes(".") ? "float" : "long" };
		return {
			type: "text",
			fields: { keyword: {
				type: "keyword",
				ignore_above: 256
			} }
		};
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const guess = guessType(item, root);
			if (guess) return guess;
		}
		return;
	}
	if (isPlainObject(value)) return { properties: {} };
};
const addValue = (unit, path, value) => {
	const list = unit.fields.get(path);
	if (list) list.push(value);
	else unit.fields.set(path, [value]);
};
const indexLeaf = (state, field, value) => {
	const values = Array.isArray(value) ? value : [value];
	for (const item of values) {
		if (Array.isArray(item)) {
			indexLeaf(state, field, item);
			continue;
		}
		const coerced = coerceLeafValue(state.host, field, item);
		if (coerced !== void 0) addValue(state.unit, field.path, coerced);
		for (const [subName, sub] of Object.entries(field.mapping.fields ?? {})) {
			const subField = {
				path: `${field.path}.${subName}`,
				type: fieldTypeOf(sub),
				mapping: sub
			};
			const subValue = coerceLeafValue(state.host, subField, item);
			if (subValue !== void 0) addValue(state.unit, subField.path, subValue);
		}
		if (field.mapping.copy_to !== void 0 && item !== null && item !== void 0) {
			const targets = Array.isArray(field.mapping.copy_to) ? field.mapping.copy_to : [field.mapping.copy_to];
			for (const target of targets) state.copies.push({
				target: String(target),
				value: item
			});
		}
	}
};
const indexObject = (state, node, source, path, dynamic) => {
	const mode = parseDynamic(node.dynamic, path || "_doc") ?? dynamic;
	for (const [name, value] of Object.entries(source)) {
		const childPath = path ? `${path}.${name}` : name;
		let child = node.properties?.[name];
		if (!child) {
			if (mode === "strict") throw strictDynamic(name, path || "_doc");
			if (mode === false) continue;
			child = guessType(value, state.host.mapping);
			if (!child) continue;
			node.properties ??= {};
			node.properties[name] = child;
		}
		const type = fieldTypeOf(child);
		if (type === "object") {
			for (const item of Array.isArray(value) ? value : [value]) {
				if (item === null || item === void 0) continue;
				if (!isPlainObject(item)) throw mapperParsing(`object mapping for [${childPath}] tried to parse field [${name}] as object, but found a concrete value`);
				indexObject(state, child, item, childPath, mode);
			}
			continue;
		}
		if (type === "nested") {
			const units = [];
			for (const item of Array.isArray(value) ? value : [value]) {
				if (item === null || item === void 0) continue;
				if (!isPlainObject(item)) throw mapperParsing(`object mapping for [${childPath}] tried to parse field [${name}] as object, but found a concrete value`);
				const unit = {
					fields: /* @__PURE__ */ new Map(),
					nested: /* @__PURE__ */ new Map(),
					source: item,
					root: state.unit.root
				};
				indexObject({
					...state,
					unit
				}, child, item, childPath, mode);
				units.push(unit);
			}
			const existing = state.unit.nested.get(childPath);
			if (existing) existing.push(...units);
			else state.unit.nested.set(childPath, units);
			continue;
		}
		indexLeaf(state, {
			path: childPath,
			type,
			mapping: child
		}, value);
	}
};
const indexDocument = (host, doc) => {
	doc.fields = /* @__PURE__ */ new Map();
	doc.nested = /* @__PURE__ */ new Map();
	const state = {
		host,
		unit: doc,
		copies: []
	};
	indexObject(state, host.mapping, doc.source, "", parseDynamic(host.mapping.dynamic, "_doc") ?? true);
	for (const copy of state.copies) {
		const target = resolveField(host.mapping, copy.target);
		if (!target || target.type === "object" || target.type === "nested") throw unsupported(`copy_to into the unmapped or non-leaf field "${copy.target}"`);
		const coerced = coerceLeafValue(host, target, copy.value);
		if (coerced !== void 0) addValue(doc, target.path, coerced);
	}
};
//#endregion
//#region src/engine/store.ts
const ALLOWED_SETTINGS = /* @__PURE__ */ new Set([
	"number_of_shards",
	"number_of_replicas",
	"refresh_interval",
	"max_result_window",
	"max_ngram_diff",
	"max_shingle_diff",
	"analysis",
	"codec",
	"auto_expand_replicas",
	"hidden",
	"mapping",
	"query",
	"creation_date",
	"uuid",
	"version",
	"provided_name"
]);
const normalizeSettings = (settings) => {
	if (settings === void 0) return {};
	if (!isPlainObject(settings)) throw illegalArgument("settings must be an object");
	const result = {};
	const put = (key, value) => {
		const base = key.startsWith("index.") ? key.slice(6) : key;
		const top = base.split(".")[0];
		if (!ALLOWED_SETTINGS.has(top)) throw unsupported(`the index setting "${key}"`);
		if (base.includes(".")) {
			let node = result;
			const parts = base.split(".");
			for (const part of parts.slice(0, -1)) {
				const next = node[part];
				node = isPlainObject(next) ? next : node[part] = {};
			}
			node[parts[parts.length - 1]] = value;
		} else result[base] = value;
	};
	for (const [key, value] of Object.entries(settings)) if (key === "index" && isPlainObject(value)) for (const [subKey, subValue] of Object.entries(value)) put(subKey, subValue);
	else put(key, value);
	return result;
};
const generateId = () => (0, node_crypto.randomBytes)(15).toString("base64url");
var Index = class {
	name;
	uuid = (0, node_crypto.randomBytes)(11).toString("base64url");
	createdAt = Date.now();
	docs = /* @__PURE__ */ new Map();
	settings;
	analysis;
	mapping;
	seqNo = 0;
	order = 0;
	constructor(name, settings, mappings) {
		this.name = name;
		this.settings = normalizeSettings(settings);
		this.analysis = buildAnalysis(this.settings.analysis);
		this.mapping = validateRootMapping(mappings, this.analysis);
	}
	putMapping(mappings) {
		const incoming = validateRootMapping(mappings, this.analysis);
		this.mapping = mergeRootMapping(this.mapping, incoming);
	}
	get(id) {
		return this.docs.get(id);
	}
	put(id, source, options = {}) {
		const existing = this.docs.get(id);
		if (existing && options.create) throw versionConflict(this.name, id);
		const doc = {
			index: this.name,
			id,
			version: existing ? existing.version + 1 : 1,
			seqNo: this.seqNo++,
			order: this.order++,
			source: clone(source),
			fields: /* @__PURE__ */ new Map(),
			nested: /* @__PURE__ */ new Map(),
			root: void 0
		};
		doc.root = doc;
		const snapshot = clone(this.mapping);
		try {
			indexDocument(this, doc);
		} catch (error) {
			this.mapping = snapshot;
			throw error;
		}
		this.docs.set(id, doc);
		return {
			doc,
			result: existing ? "updated" : "created"
		};
	}
	update(id, body) {
		if (body.script !== void 0) throw unsupported("scripted updates");
		for (const key of Object.keys(body)) if (![
			"doc",
			"doc_as_upsert",
			"upsert",
			"detect_noop",
			"_source",
			"scripted_upsert"
		].includes(key)) throw unsupported(`the "${key}" update option`);
		const existing = this.docs.get(id);
		const patch = body.doc;
		if (!existing) {
			if (isPlainObject(body.upsert)) return this.put(id, body.upsert);
			if (body.doc_as_upsert === true && isPlainObject(patch)) return this.put(id, patch);
			throw documentMissing(this.name, id);
		}
		if (!isPlainObject(patch)) throw illegalArgument("Validation Failed: 1: script or doc is missing;");
		const merged = deepMerge(existing.source, patch);
		if (body.detect_noop !== false && deepEqual(merged, existing.source)) return {
			doc: existing,
			result: "noop"
		};
		return this.put(id, merged);
	}
	delete(id) {
		const doc = this.docs.get(id);
		if (doc) this.docs.delete(id);
		return doc;
	}
	describe() {
		return {
			aliases: {},
			mappings: this.mapping,
			settings: { index: {
				creation_date: String(this.createdAt),
				number_of_shards: "1",
				number_of_replicas: "1",
				...this.settings,
				uuid: this.uuid,
				version: { created: "137217827" },
				provided_name: this.name
			} }
		};
	}
};
const patternToRegExp = (pattern) => {
	return new RegExp(`^${pattern.split("*").map(escapeRegExp$1).join(".*")}$`);
};
const escapeRegExp$1 = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var Store = class {
	indices = /* @__PURE__ */ new Map();
	create(name, settings, mappings) {
		if (name.includes(",") || name.includes("*")) throw unsupported("creating several indices at once");
		if (name.startsWith("_") || name.startsWith("-") || name.startsWith("+") || name !== name.toLowerCase()) throw illegalArgument(`Invalid index name [${name}], must be lowercase and must not start with '_', '-', or '+'`);
		if (this.indices.has(name)) throw indexExists(name);
		const index = new Index(name, settings, mappings);
		this.indices.set(name, index);
		return index;
	}
	get(name) {
		const index = this.indices.get(name);
		if (!index) throw indexNotFound(name);
		return index;
	}
	getOrCreate(name) {
		return this.indices.get(name) ?? this.create(name, void 0, void 0);
	}
	has(name) {
		return this.indices.has(name);
	}
	resolve(expression) {
		if (expression === void 0 || expression === "" || expression === "_all" || expression === "*") return [...this.indices.values()];
		const result = [];
		for (const part of expression.split(",")) if (part.includes("*")) {
			const regex = patternToRegExp(part);
			for (const index of this.indices.values()) if (regex.test(index.name) && !result.includes(index)) result.push(index);
		} else {
			const index = this.get(part);
			if (!result.includes(index)) result.push(index);
		}
		return result;
	}
	delete(expression) {
		for (const index of this.resolve(expression)) this.indices.delete(index.name);
	}
	reset() {
		this.indices.clear();
	}
};
//#endregion
//#region src/engine/fuzzy.ts
const resolveFuzziness = (fuzziness, term) => {
	if (fuzziness === void 0 || fuzziness === null) return 0;
	if (typeof fuzziness === "number") {
		if (fuzziness < 0 || fuzziness > 2 || !Number.isInteger(fuzziness)) throw illegalArgument(`Valid edit distances are [0, 1, 2] but was [${fuzziness}]`);
		return fuzziness;
	}
	if (typeof fuzziness === "string") {
		const upper = fuzziness.toUpperCase();
		if (/^\d$/.test(upper)) return resolveFuzziness(Number(upper), term);
		const auto = /^AUTO(?::(\d+),(\d+))?$/.exec(upper);
		if (auto) {
			const low = auto[1] ? Number(auto[1]) : 3;
			const high = auto[2] ? Number(auto[2]) : 6;
			if (term.length < low) return 0;
			if (term.length < high) return 1;
			return 2;
		}
	}
	throw illegalArgument(`fuzziness cannot be [${String(fuzziness)}]`);
};
const editDistance = (a, b, max, prefixLength = 0, transpositions = true) => {
	if (prefixLength > 0) {
		if (a.length < prefixLength || b.length < prefixLength) return Infinity;
		if (a.slice(0, prefixLength) !== b.slice(0, prefixLength)) return Infinity;
		a = a.slice(prefixLength);
		b = b.slice(prefixLength);
	}
	if (Math.abs(a.length - b.length) > max) return Infinity;
	if (a === b) return 0;
	const rows = [];
	for (let i = 0; i <= a.length; i++) {
		rows.push(Array.from({ length: b.length + 1 }, () => 0));
		rows[i][0] = i;
	}
	for (let j = 0; j <= b.length; j++) rows[0][j] = j;
	for (let i = 1; i <= a.length; i++) {
		let rowMin = Infinity;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
			if (transpositions && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, rows[i - 2][j - 2] + 1);
			rows[i][j] = value;
			rowMin = Math.min(rowMin, value);
		}
		if (rowMin > max) return Infinity;
	}
	const distance = rows[a.length][b.length];
	return distance > max ? Infinity : distance;
};
//#endregion
//#region src/engine/query-string.ts
var ParseError = class extends Error {};
const addClause = (clauses, conjunction, modifier, node, defaultOperator) => {
	const last = clauses[clauses.length - 1];
	if (last && conjunction === "and" && last.occur !== "must_not") last.occur = "must";
	if (last && defaultOperator === "and" && conjunction === "or" && last.occur !== "must_not") last.occur = "should";
	let occur;
	if (modifier === "not") occur = "must_not";
	else if (modifier === "must") occur = "must";
	else if (defaultOperator === "or") occur = conjunction === "and" ? "must" : "should";
	else occur = conjunction === "or" ? "should" : "must";
	clauses.push({
		occur,
		node
	});
};
const TERM_STOP = /* @__PURE__ */ new Set([
	" ",
	"	",
	"\n",
	"\r",
	"(",
	")",
	":",
	"^",
	"~",
	"\"",
	"[",
	"]",
	"{",
	"}"
]);
var Parser$1 = class {
	text;
	defaultOperator;
	pos = 0;
	constructor(text, defaultOperator) {
		this.text = text;
		this.defaultOperator = defaultOperator;
	}
	peek(offset = 0) {
		return this.text[this.pos + offset];
	}
	eof() {
		return this.pos >= this.text.length;
	}
	skipSpace() {
		while (!this.eof() && /\s/.test(this.peek())) this.pos++;
	}
	matchWord(word) {
		if (this.text.startsWith(word, this.pos)) {
			const after = this.text[this.pos + word.length];
			if (after === void 0 || /[\s(]/.test(after) || word === "&&" || word === "||") {
				this.pos += word.length;
				return true;
			}
		}
		return false;
	}
	parseClauses() {
		const clauses = [];
		while (true) {
			this.skipSpace();
			if (this.eof() || this.peek() === ")") break;
			let conjunction = "none";
			if (this.matchWord("AND") || this.matchWord("&&")) conjunction = "and";
			else if (this.matchWord("OR") || this.matchWord("||")) conjunction = "or";
			this.skipSpace();
			if (this.eof() || this.peek() === ")") {
				if (conjunction !== "none") throw new ParseError("dangling operator");
				break;
			}
			let modifier = "none";
			if (this.matchWord("NOT")) modifier = "not";
			else if (this.peek() === "+") {
				modifier = "must";
				this.pos++;
			} else if (this.peek() === "-" || this.peek() === "!") {
				modifier = "not";
				this.pos++;
			}
			this.skipSpace();
			if (this.eof()) throw new ParseError("dangling modifier");
			const node = this.parseClause();
			addClause(clauses, conjunction, modifier, node, this.defaultOperator);
		}
		return clauses;
	}
	parseClause() {
		const char = this.peek();
		if (char === "(") return this.parseGroup(void 0);
		if (char === "\"") return this.parsePhrase(void 0);
		if (char === "[" || char === "{") return this.parseRange(void 0);
		const text = this.readTerm();
		if (this.peek() === ":") {
			this.pos++;
			return this.parseFieldValue(text);
		}
		return this.finishTerm(void 0, text);
	}
	parseFieldValue(field) {
		const char = this.peek();
		if (char === "(") return this.parseGroup(field);
		if (char === "\"") return this.parsePhrase(field);
		if (char === "[" || char === "{") return this.parseRange(field);
		if (char === ">" || char === "<") {
			const operator = this.peek(1) === "=" ? `${char}=` : char;
			this.pos += operator.length;
			const value = this.readTerm();
			if (value === "") throw new ParseError("missing range value");
			const bounds = {};
			if (operator === ">") bounds.gt = value;
			else if (operator === ">=") bounds.gte = value;
			else if (operator === "<") bounds.lt = value;
			else bounds.lte = value;
			return {
				kind: "range",
				field,
				bounds,
				boost: this.readBoost()
			};
		}
		if (field === "_exists_") {
			const target = this.readTerm();
			if (target === "") throw new ParseError("missing field for _exists_");
			return {
				kind: "exists",
				field: target,
				boost: this.readBoost()
			};
		}
		const text = this.readTerm();
		if (text === "") throw new ParseError("missing field value");
		if (field === "*" && text === "*") return {
			kind: "all",
			boost: this.readBoost()
		};
		return this.finishTerm(field, text);
	}
	finishTerm(field, text) {
		if (text === "") throw new ParseError("empty term");
		if (text === "*" && field === void 0) return {
			kind: "all",
			boost: this.readBoost()
		};
		let fuzzy;
		if (this.peek() === "~") {
			this.pos++;
			const digits = this.readNumber();
			fuzzy = digits === void 0 ? "auto" : Math.min(2, Math.round(digits));
		}
		const boost = this.readBoost();
		return {
			kind: "term",
			field,
			text: unescape(text),
			fuzzy,
			boost
		};
	}
	parseGroup(field) {
		this.pos++;
		const clauses = this.parseClauses();
		if (this.peek() !== ")") throw new ParseError("missing closing parenthesis");
		this.pos++;
		return {
			kind: "group",
			field,
			clauses,
			boost: this.readBoost()
		};
	}
	parsePhrase(field) {
		this.pos++;
		let text = "";
		while (!this.eof() && this.peek() !== "\"") {
			if (this.peek() === "\\" && this.peek(1) !== void 0) this.pos++;
			text += this.peek();
			this.pos++;
		}
		if (this.eof()) throw new ParseError("missing closing quote");
		this.pos++;
		let slop;
		if (this.peek() === "~") {
			this.pos++;
			slop = this.readNumber() ?? 0;
		}
		return {
			kind: "phrase",
			field,
			text,
			slop,
			boost: this.readBoost()
		};
	}
	parseRange(field) {
		const open = this.peek();
		this.pos++;
		const close = this.text.indexOf(open === "[" ? "]" : "}", this.pos);
		const closeAlt = this.text.indexOf(open === "[" ? "}" : "]", this.pos);
		const end = close === -1 ? closeAlt : closeAlt === -1 ? close : Math.min(close, closeAlt);
		if (end === -1) throw new ParseError("missing closing bracket");
		const inner = this.text.slice(this.pos, end);
		const closing = this.text[end];
		this.pos = end + 1;
		const parts = inner.split(/\s+TO\s+/);
		if (parts.length !== 2) throw new ParseError("range needs TO");
		const [from, to] = parts.map((p) => p.trim().replace(/^"|"$/g, ""));
		const bounds = {};
		if (from !== "*" && from !== "") {
			if (open === "[") bounds.gte = from;
			else bounds.gt = from;
		}
		if (to !== "*" && to !== "") {
			if (closing === "]") bounds.lte = to;
			else bounds.lt = to;
		}
		return {
			kind: "range",
			field,
			bounds,
			boost: this.readBoost()
		};
	}
	readTerm() {
		let text = "";
		while (!this.eof()) {
			const char = this.peek();
			if (char === "\\" && this.peek(1) !== void 0) {
				text += char + this.peek(1);
				this.pos += 2;
				continue;
			}
			if (TERM_STOP.has(char)) break;
			text += char;
			this.pos++;
		}
		return text;
	}
	readNumber() {
		const match = /^\d+(\.\d+)?/.exec(this.text.slice(this.pos));
		if (!match) return void 0;
		this.pos += match[0].length;
		return Number(match[0]);
	}
	readBoost() {
		if (this.peek() !== "^") return void 0;
		this.pos++;
		const value = this.readNumber();
		if (value === void 0) throw new ParseError("missing boost value");
		return value;
	}
};
const unescape = (text) => text.replace(/\\(.)/g, "$1");
const parseQueryString = (text, defaultOperator) => {
	const parser = new Parser$1(text, defaultOperator);
	const clauses = parser.parseClauses();
	parser.skipSpace();
	if (!parser.eof()) throw new ParseError(`unexpected input at ${parser.pos}`);
	return clauses;
};
const parseSimpleQueryString = (text, defaultOperator) => {
	const tokens = tokenizeSimple(text);
	let pos = 0;
	const parseGroup = () => {
		const clauses = [];
		let conjunction = "none";
		let modifier = "none";
		while (pos < tokens.length) {
			const token = tokens[pos];
			if (token.type === "close") break;
			pos++;
			if (token.type === "and") {
				conjunction = "and";
				continue;
			}
			if (token.type === "or") {
				conjunction = "or";
				continue;
			}
			if (token.type === "not") {
				modifier = "not";
				continue;
			}
			let node;
			if (token.type === "open") {
				const inner = parseGroup();
				if (tokens[pos]?.type === "close") pos++;
				node = {
					kind: "group",
					clauses: inner
				};
			} else if (token.type === "phrase") node = {
				kind: "phrase",
				text: token.text,
				slop: token.slop
			};
			else if (token.type === "term") node = {
				kind: "term",
				text: token.text,
				fuzzy: token.fuzzy
			};
			else continue;
			addClause(clauses, conjunction, modifier, node, defaultOperator);
			conjunction = "none";
			modifier = "none";
		}
		return clauses;
	};
	const clauses = parseGroup();
	while (pos < tokens.length) {
		pos++;
		clauses.push(...parseGroup());
	}
	return clauses;
};
const tokenizeSimple = (text) => {
	const tokens = [];
	let pos = 0;
	const readNumber = () => {
		const match = /^\d+/.exec(text.slice(pos));
		if (!match) return void 0;
		pos += match[0].length;
		return Number(match[0]);
	};
	while (pos < text.length) {
		const char = text[pos];
		if (/\s/.test(char)) pos++;
		else if (char === "+") {
			tokens.push({ type: "and" });
			pos++;
		} else if (char === "|") {
			tokens.push({ type: "or" });
			pos++;
		} else if (char === "-" && (pos === 0 || /[\s(]/.test(text[pos - 1]))) {
			tokens.push({ type: "not" });
			pos++;
		} else if (char === "(") {
			tokens.push({ type: "open" });
			pos++;
		} else if (char === ")") {
			tokens.push({ type: "close" });
			pos++;
		} else if (char === "\"") {
			pos++;
			let phrase = "";
			while (pos < text.length && text[pos] !== "\"") {
				if (text[pos] === "\\" && pos + 1 < text.length) pos++;
				phrase += text[pos];
				pos++;
			}
			pos++;
			let slop;
			if (text[pos] === "~") {
				pos++;
				slop = readNumber() ?? 0;
			}
			tokens.push({
				type: "phrase",
				text: phrase,
				slop
			});
		} else {
			let term = "";
			while (pos < text.length && !/[\s+|()"~]/.test(text[pos])) {
				if (text[pos] === "\\" && pos + 1 < text.length) pos++;
				term += text[pos];
				pos++;
			}
			let fuzzy;
			if (text[pos] === "~") {
				pos++;
				const n = readNumber();
				fuzzy = n === void 0 ? "auto" : Math.min(2, n);
			}
			if (term.length > 0) tokens.push({
				type: "term",
				text: term,
				fuzzy
			});
		}
	}
	return tokens;
};
//#endregion
//#region src/engine/query.ts
const createContext = (index, now = Date.now()) => ({
	index,
	now,
	leafFields: listLeafFields(index.mapping),
	docFreq: /* @__PURE__ */ new Map(),
	fieldLength: /* @__PURE__ */ new Map()
});
const MATCH_NONE = { match: () => void 0 };
const matchAll = (boost) => ({ match: () => boost });
const asBoost = (value, what = "boost") => {
	if (value === void 0) return 1;
	if (typeof value === "number") return value;
	if (typeof value === "string" && !Number.isNaN(Number(value))) return Number(value);
	throw parsingError(`[${what}] must be a number`);
};
const asObject$1 = (value, clause) => {
	if (!isPlainObject(value)) throw parsingError(`[${clause}] query malformed, expected an object`);
	return value;
};
const singleField = (body, clause) => {
	const entries = Object.entries(body);
	if (entries.length !== 1) throw parsingError(`[${clause}] query doesn't support multiple fields, found [${entries.map((e) => e[0]).join(", ")}]`);
	return entries[0];
};
const rejectOptions$1 = (body, allowed, clause) => {
	for (const key of Object.keys(body)) if (!allowed.includes(key)) throw unsupported(`the "${key}" option of the "${clause}" query`);
};
const valuesOf$1 = (unit, field) => {
	const values = unit.fields.get(field.path);
	if (!values) return [];
	if (field.type === "text") {
		const tokens = [];
		for (const value of values) if (value instanceof TextValue) tokens.push(...value.tokens);
		return tokens;
	}
	return values;
};
const K1 = 1.2;
const B = .75;
const docFreq = (ctx, field, key, predicate) => {
	const cacheKey = `${field.path} ${key}`;
	const cached = ctx.docFreq.get(cacheKey);
	if (cached !== void 0) return cached;
	let count = 0;
	for (const doc of ctx.index.docs.values()) if (valuesOf$1(doc, field).some(predicate)) count++;
	ctx.docFreq.set(cacheKey, count);
	return count;
};
const averageLength = (ctx, field) => {
	const cached = ctx.fieldLength.get(field.path);
	if (cached !== void 0) return cached;
	let total = 0;
	let docs = 0;
	for (const doc of ctx.index.docs.values()) {
		const length = valuesOf$1(doc, field).length;
		if (length > 0) {
			total += length;
			docs++;
		}
	}
	const average = docs === 0 ? 1 : total / docs;
	ctx.fieldLength.set(field.path, average);
	return average;
};
const termLike = (ctx, field, key, predicate, boost, constant = false) => ({ match: (unit) => {
	const values = valuesOf$1(unit, field);
	let tf = 0;
	for (const value of values) if (predicate(value)) tf++;
	if (tf === 0) return void 0;
	if (constant) return boost;
	const n = docFreq(ctx, field, key, predicate);
	const total = ctx.index.docs.size;
	const idf = Math.log(1 + (total - n + .5) / (n + .5));
	const norm = K1 * (.25 + B * values.length / averageLength(ctx, field));
	return boost * idf * (tf * 2.2 / (tf + norm));
} });
const coerceQueryValue = (ctx, field, value, options = {}) => {
	const { type } = field;
	if (isNumericType(type)) {
		if (typeof value === "number") return value;
		if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
		if (typeof value === "boolean") return value ? 1 : 0;
		throw queryShard(`failed to create query: For input string: "${String(value)}"`);
	}
	if (type === "boolean") {
		if (typeof value === "boolean") return value;
		if (value === "true") return true;
		if (value === "false") return false;
		throw queryShard(`failed to create query: Can't parse boolean value [${String(value)}], expected [true] or [false]`);
	}
	if (type === "date") {
		const format = options.format ? parseDateFormat(options.format) : dateFormatOf(field);
		if (typeof value === "number") return value;
		if (typeof value !== "string") throw queryShard(`failed to create query: Cannot parse date [${String(value)}]`);
		return parseDateMath(value, format, options.roundUp ?? false, ctx.now);
	}
	if (type === "keyword") return normalizeKeyword(ctx.index, field, String(value));
	return String(value);
};
const equals = (a, b, caseInsensitive) => {
	if (caseInsensitive && typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
	return a === b;
};
const requireStringField = (field, clause) => {
	if (field.type !== "keyword" && field.type !== "text" && field.type !== "ip") throw queryShard(`Can only use ${clause} queries on keyword and text fields - not on [${field.path}] which is of type [${field.type}]`);
};
const termQuery = (ctx, field, value, boost, caseInsensitive = false) => {
	const target = coerceQueryValue(ctx, field, value);
	return termLike(ctx, field, `term:${String(target)}:${caseInsensitive}`, (v) => equals(v, target, caseInsensitive), boost);
};
const termsQuery = (ctx, field, values, boost) => {
	const targets = values.map((v) => coerceQueryValue(ctx, field, v));
	return termLike(ctx, field, `terms:${targets.join(",")}`, (v) => targets.some((t) => t === v), boost, true);
};
const prefixQuery = (ctx, field, value, boost, caseInsensitive = false) => {
	requireStringField(field, "prefix");
	const prefix = caseInsensitive ? value.toLowerCase() : value;
	return termLike(ctx, field, `prefix:${prefix}:${caseInsensitive}`, (v) => typeof v === "string" && (caseInsensitive ? v.toLowerCase() : v).startsWith(prefix), boost, true);
};
const wildcardToRegExp = (pattern, flags) => {
	let source = "";
	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i];
		if (char === "\\" && i + 1 < pattern.length) source += escapeRegExp(pattern[++i]);
		else if (char === "*") source += ".*";
		else if (char === "?") source += ".";
		else source += escapeRegExp(char);
	}
	return new RegExp(`^${source}$`, flags);
};
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wildcardQuery = (ctx, field, value, boost, caseInsensitive = false) => {
	requireStringField(field, "wildcard");
	const regex = wildcardToRegExp(value, caseInsensitive ? "is" : "s");
	return termLike(ctx, field, `wildcard:${value}:${caseInsensitive}`, (v) => typeof v === "string" && regex.test(v), boost, true);
};
const regexpQuery = (ctx, field, value, boost, caseInsensitive = false) => {
	requireStringField(field, "regexp");
	let regex;
	try {
		regex = new RegExp(`^(?:${value})$`, caseInsensitive ? "is" : "s");
	} catch {
		throw queryShard(`failed to create query: Invalid regular expression [${value}]`);
	}
	return termLike(ctx, field, `regexp:${value}:${caseInsensitive}`, (v) => typeof v === "string" && regex.test(v), boost, true);
};
const fuzzyQuery = (ctx, field, value, boost, options) => {
	requireStringField(field, "fuzzy");
	const max = resolveFuzziness(options.fuzziness ?? "AUTO", value);
	const prefixLength = options.prefixLength ?? 0;
	const transpositions = options.transpositions ?? true;
	const predicate = (v) => typeof v === "string" && editDistance(value, v, max, prefixLength, transpositions) <= max;
	return termLike(ctx, field, `fuzzy:${value}:${max}:${prefixLength}:${transpositions}`, predicate, boost);
};
const rangeQuery = (ctx, field, bounds, boost) => {
	if (field.type === "boolean") throw queryShard(`failed to create query: Field [${field.path}] of type [boolean] does not support range queries`);
	const gt = bounds.gt === void 0 ? void 0 : coerceQueryValue(ctx, field, bounds.gt, {
		roundUp: true,
		format: bounds.format
	});
	const gte = bounds.gte === void 0 ? void 0 : coerceQueryValue(ctx, field, bounds.gte, {
		roundUp: false,
		format: bounds.format
	});
	const lt = bounds.lt === void 0 ? void 0 : coerceQueryValue(ctx, field, bounds.lt, {
		roundUp: false,
		format: bounds.format
	});
	const lte = bounds.lte === void 0 ? void 0 : coerceQueryValue(ctx, field, bounds.lte, {
		roundUp: true,
		format: bounds.format
	});
	const predicate = (v) => {
		if (typeof v === "boolean") return false;
		if (gt !== void 0 && !(v > gt)) return false;
		if (gte !== void 0 && !(v >= gte)) return false;
		if (lt !== void 0 && !(v < lt)) return false;
		if (lte !== void 0 && !(v <= lte)) return false;
		return true;
	};
	return termLike(ctx, field, `range:${String(gt)}:${String(gte)}:${String(lt)}:${String(lte)}`, predicate, boost, true);
};
const existsQuery = (ctx, path, boost) => {
	const field = resolveField(ctx.index.mapping, path);
	if (!field) return MATCH_NONE;
	if (field.type === "object" || field.type === "nested") {
		const prefix = `${path}.`;
		return { match: (unit) => {
			for (const [key, values] of unit.fields) if (key.startsWith(prefix) && values.length > 0) return boost;
			for (const [key, units] of unit.nested) if ((key === path || key.startsWith(prefix)) && units.length > 0) return boost;
		} };
	}
	return { match: (unit) => (unit.fields.get(path)?.length ?? 0) > 0 ? boost : void 0 };
};
const resolveMinimumShouldMatch = (spec, count) => {
	if (spec === void 0 || spec === null) return 0;
	const apply = (text) => {
		const trimmed = text.trim();
		const combo = /^(-?\d+)<(.+)$/.exec(trimmed);
		if (combo) return count <= Number(combo[1]) ? count : apply(combo[2]);
		const percent = /^(-?\d+)%$/.exec(trimmed);
		if (percent) {
			const value = Number(percent[1]);
			const share = Math.floor(count * Math.abs(value) / 100);
			return value < 0 ? count - share : share;
		}
		if (/^-?\d+$/.test(trimmed)) {
			const value = Number(trimmed);
			return value < 0 ? Math.max(0, count + value) : value;
		}
		throw parsingError(`Invalid minimum_should_match value [${text}]`);
	};
	if (typeof spec === "number") return spec < 0 ? Math.max(0, count + spec) : spec;
	if (typeof spec === "string") {
		if (spec.includes(" ")) throw unsupported("multiple minimum_should_match specifications");
		return apply(spec);
	}
	throw parsingError(`Invalid minimum_should_match value [${String(spec)}]`);
};
const boolQuery = ({ must, filter, should, mustNot, minimumShouldMatch, boost = 1 }) => {
	if (must.length + filter.length + should.length + mustNot.length === 0) return matchAll(boost);
	const optionalOnly = should.length > 0 && must.length === 0 && filter.length === 0;
	const requested = minimumShouldMatch === void 0 ? 0 : resolveMinimumShouldMatch(minimumShouldMatch, should.length);
	const msm = optionalOnly ? Math.max(1, requested) : requested;
	return { match: (unit) => {
		let score = 0;
		for (const query of must) {
			const s = query.match(unit);
			if (s === void 0) return void 0;
			score += s;
		}
		for (const query of filter) if (query.match(unit) === void 0) return void 0;
		for (const query of mustNot) if (query.match(unit) !== void 0) return void 0;
		let matched = 0;
		for (const query of should) {
			const s = query.match(unit);
			if (s !== void 0) {
				matched++;
				score += s;
			}
		}
		if (matched < msm) return void 0;
		return score * boost;
	} };
};
const disMaxQuery = (queries, tieBreaker, boost) => ({ match: (unit) => {
	let best;
	let rest = 0;
	for (const query of queries) {
		const s = query.match(unit);
		if (s === void 0) continue;
		if (best === void 0 || s > best) {
			if (best !== void 0) rest += best;
			best = s;
		} else rest += s;
	}
	return best === void 0 ? void 0 : (best + tieBreaker * rest) * boost;
} });
const filtered = (query, boost) => ({ match: (unit) => query.match(unit) === void 0 ? void 0 : boost });
const analyzeForField = (ctx, field, text, analyzer) => {
	if (analyzer) return ctx.index.analysis.analyzer(analyzer)(text);
	return searchAnalyzerOf(ctx.index, field)(text);
};
const matchQuery = (ctx, field, text, boost, options) => {
	if (field.type === "object" || field.type === "nested") throw queryShard(`failed to create query: Can't run match on object field [${field.path}]`);
	if (field.type !== "text") try {
		return options.lastTermPrefix ? prefixQuery(ctx, field, String(text), boost) : termQuery(ctx, field, text, boost);
	} catch (error) {
		if (options.lenient) return MATCH_NONE;
		throw error;
	}
	const tokens = analyzeForField(ctx, field, String(text), options.analyzer);
	if (tokens.length === 0) return options.zeroTermsQuery === "all" ? matchAll(boost) : MATCH_NONE;
	const clauses = tokens.map((token, i) => {
		if (options.lastTermPrefix && i === tokens.length - 1) return prefixQuery(ctx, field, token, 1);
		if (options.fuzziness !== void 0 && options.fuzziness !== 0 && options.fuzziness !== "0") return fuzzyQuery(ctx, field, token, 1, {
			fuzziness: options.fuzziness,
			prefixLength: options.prefixLength,
			transpositions: options.transpositions
		});
		return termLike(ctx, field, `term:${token}:false`, (v) => v === token, 1);
	});
	const operator = (options.operator ?? "or").toLowerCase();
	if (operator !== "and" && operator !== "or") throw parsingError(`operator [${options.operator}] is not valid`);
	return operator === "and" ? boolQuery({
		must: clauses,
		filter: [],
		should: [],
		mustNot: [],
		boost
	}) : boolQuery({
		must: [],
		filter: [],
		should: clauses,
		mustNot: [],
		minimumShouldMatch: options.minimumShouldMatch ?? 1,
		boost
	});
};
const phrasePositions = (tokens, phrase, slop, prefix) => {
	const matchesAt = (index, i) => {
		const token = tokens[index];
		if (token === void 0) return false;
		const target = phrase[i];
		return prefix && i === phrase.length - 1 ? token.startsWith(target) : token === target;
	};
	if (slop === 0) {
		for (let start = 0; start + phrase.length <= tokens.length; start++) {
			let ok = true;
			for (let i = 0; i < phrase.length && ok; i++) if (!matchesAt(start + i, i)) ok = false;
			if (ok) return true;
		}
		return false;
	}
	const candidates = phrase.map((_, i) => {
		const positions = [];
		for (let p = 0; p < tokens.length; p++) if (matchesAt(p, i)) positions.push(p - i);
		return positions;
	});
	if (candidates.some((c) => c.length === 0)) return false;
	const search = (i, min, max, used) => {
		if (i === phrase.length) return max - min <= slop;
		for (const shifted of candidates[i]) {
			const actual = shifted + i;
			if (used.includes(actual)) continue;
			if (Math.max(max, shifted) - Math.min(min, shifted) > slop) continue;
			if (search(i + 1, Math.min(min, shifted), Math.max(max, shifted), [...used, actual])) return true;
		}
		return false;
	};
	return search(0, Infinity, -Infinity, []);
};
const phraseQuery = (ctx, field, text, boost, slop, prefix, analyzer) => {
	if (field.type !== "text") {
		if (field.type === "keyword" && prefix) return prefixQuery(ctx, field, String(text), boost);
		return termQuery(ctx, field, text, boost);
	}
	const phrase = analyzeForField(ctx, field, String(text), analyzer);
	if (phrase.length === 0) return MATCH_NONE;
	const scorers = phrase.map((token) => termLike(ctx, field, `term:${token}:false`, (v) => v === token, 1));
	return { match: (unit) => {
		const values = unit.fields.get(field.path);
		if (!values) return void 0;
		let found = false;
		for (const value of values) if (value instanceof TextValue && phrasePositions(value.tokens, phrase, slop, prefix)) {
			found = true;
			break;
		}
		if (!found) return void 0;
		let score = 0;
		for (const scorer of scorers) score += scorer.match(unit) ?? 0;
		return Math.max(score, 1e-4) * boost;
	} };
};
const expandFields = (ctx, specs, lenientDefault) => {
	const list = specs === void 0 ? ["*"] : Array.isArray(specs) ? specs.map(String) : [String(specs)];
	const lenient = lenientDefault || specs === void 0 || list.includes("*");
	const fields = [];
	for (const spec of list) {
		const caret = spec.lastIndexOf("^");
		const name = caret === -1 ? spec : spec.slice(0, caret);
		const boost = caret === -1 ? 1 : asBoost(spec.slice(caret + 1));
		if (name.includes("*")) for (const field of matchFieldPattern(name, ctx.leafFields)) fields.push({
			field,
			boost
		});
		else {
			const field = resolveField(ctx.index.mapping, name);
			if (field) fields.push({
				field,
				boost
			});
		}
	}
	return {
		fields,
		lenient
	};
};
const compileMatchLike = (ctx, body, clause) => {
	const [name, spec] = singleField(asObject$1(body, clause), clause);
	const options = isPlainObject(spec) ? spec : { query: spec };
	if (options.query === void 0) throw parsingError(`[${clause}] requires query value`);
	const field = resolveField(ctx.index.mapping, name);
	if (!field) return MATCH_NONE;
	const boost = asBoost(options.boost);
	if (clause === "match") {
		rejectOptions$1(options, [
			"query",
			"operator",
			"fuzziness",
			"prefix_length",
			"max_expansions",
			"fuzzy_transpositions",
			"fuzzy_rewrite",
			"minimum_should_match",
			"zero_terms_query",
			"lenient",
			"boost",
			"analyzer",
			"auto_generate_synonyms_phrase_query",
			"_name"
		], clause);
		return matchQuery(ctx, field, options.query, boost, {
			operator: options.operator === void 0 ? void 0 : String(options.operator),
			fuzziness: options.fuzziness,
			prefixLength: options.prefix_length === void 0 ? void 0 : Number(options.prefix_length),
			transpositions: options.fuzzy_transpositions === void 0 ? void 0 : options.fuzzy_transpositions !== false,
			minimumShouldMatch: options.minimum_should_match,
			zeroTermsQuery: options.zero_terms_query === void 0 ? void 0 : String(options.zero_terms_query),
			lenient: options.lenient === true,
			analyzer: options.analyzer === void 0 ? void 0 : String(options.analyzer)
		});
	}
	if (clause === "match_bool_prefix") {
		rejectOptions$1(options, [
			"query",
			"operator",
			"fuzziness",
			"prefix_length",
			"max_expansions",
			"fuzzy_transpositions",
			"fuzzy_rewrite",
			"minimum_should_match",
			"boost",
			"analyzer",
			"_name"
		], clause);
		return matchQuery(ctx, field, options.query, boost, {
			operator: options.operator === void 0 ? void 0 : String(options.operator),
			fuzziness: options.fuzziness,
			prefixLength: options.prefix_length === void 0 ? void 0 : Number(options.prefix_length),
			transpositions: options.fuzzy_transpositions === void 0 ? void 0 : options.fuzzy_transpositions !== false,
			minimumShouldMatch: options.minimum_should_match,
			analyzer: options.analyzer === void 0 ? void 0 : String(options.analyzer),
			lastTermPrefix: true
		});
	}
	rejectOptions$1(options, [
		"query",
		"slop",
		"analyzer",
		"boost",
		"max_expansions",
		"zero_terms_query",
		"_name"
	], clause);
	return phraseQuery(ctx, field, options.query, boost, Number(options.slop ?? 0), clause === "match_phrase_prefix", options.analyzer === void 0 ? void 0 : String(options.analyzer));
};
const compileMultiMatch = (ctx, body) => {
	const options = asObject$1(body, "multi_match");
	rejectOptions$1(options, [
		"query",
		"fields",
		"type",
		"operator",
		"fuzziness",
		"prefix_length",
		"max_expansions",
		"fuzzy_transpositions",
		"minimum_should_match",
		"tie_breaker",
		"boost",
		"slop",
		"lenient",
		"analyzer",
		"zero_terms_query",
		"auto_generate_synonyms_phrase_query",
		"_name"
	], "multi_match");
	if (options.query === void 0) throw parsingError("[multi_match] requires query value");
	const type = String(options.type ?? "best_fields");
	if (![
		"best_fields",
		"most_fields",
		"phrase",
		"phrase_prefix"
	].includes(type)) throw unsupported(`the "${type}" multi_match type`);
	const { fields, lenient } = expandFields(ctx, options.fields, options.lenient === true);
	const boost = asBoost(options.boost);
	const tieBreaker = options.tie_breaker === void 0 ? type === "most_fields" ? 1 : 0 : Number(options.tie_breaker);
	const queries = [];
	for (const { field, boost: fieldBoost } of fields) {
		if (field.type === "object" || field.type === "nested") continue;
		try {
			if (type === "phrase" || type === "phrase_prefix") queries.push(phraseQuery(ctx, field, options.query, fieldBoost, Number(options.slop ?? 0), type === "phrase_prefix", options.analyzer === void 0 ? void 0 : String(options.analyzer)));
			else queries.push(matchQuery(ctx, field, options.query, fieldBoost, {
				operator: options.operator === void 0 ? void 0 : String(options.operator),
				fuzziness: options.fuzziness,
				prefixLength: options.prefix_length === void 0 ? void 0 : Number(options.prefix_length),
				transpositions: options.fuzzy_transpositions === void 0 ? void 0 : options.fuzzy_transpositions !== false,
				minimumShouldMatch: options.minimum_should_match,
				zeroTermsQuery: options.zero_terms_query === void 0 ? void 0 : String(options.zero_terms_query),
				lenient,
				analyzer: options.analyzer === void 0 ? void 0 : String(options.analyzer)
			}));
		} catch (error) {
			if (!lenient) throw error;
		}
	}
	if (queries.length === 0) return MATCH_NONE;
	return type === "most_fields" ? boolQuery({
		must: [],
		filter: [],
		should: queries,
		mustNot: [],
		minimumShouldMatch: 1,
		boost
	}) : disMaxQuery(queries, tieBreaker, boost);
};
const asQueryList = (value) => {
	if (value === void 0) return [];
	return Array.isArray(value) ? value : [value];
};
const compileBool = (ctx, body) => {
	const options = asObject$1(body, "bool");
	rejectOptions$1(options, [
		"must",
		"filter",
		"should",
		"must_not",
		"minimum_should_match",
		"boost",
		"_name",
		"adjust_pure_negative"
	], "bool");
	return boolQuery({
		must: asQueryList(options.must).map((q) => compileQuery(ctx, q)),
		filter: asQueryList(options.filter).map((q) => filtered(compileQuery(ctx, q), 0)),
		should: asQueryList(options.should).map((q) => compileQuery(ctx, q)),
		mustNot: asQueryList(options.must_not).map((q) => compileQuery(ctx, q)),
		minimumShouldMatch: options.minimum_should_match,
		boost: asBoost(options.boost)
	});
};
const compileNested = (ctx, body) => {
	const options = asObject$1(body, "nested");
	rejectOptions$1(options, [
		"path",
		"query",
		"score_mode",
		"ignore_unmapped",
		"boost",
		"_name",
		"inner_hits"
	], "nested");
	if (options.inner_hits !== void 0) throw unsupported("inner_hits on nested queries");
	if (typeof options.path !== "string") throw parsingError("[nested] requires 'path' field");
	if (options.query === void 0) throw parsingError("[nested] requires 'query' field");
	const path = options.path;
	const field = resolveField(ctx.index.mapping, path);
	if (!field || field.type !== "nested") {
		if (options.ignore_unmapped === true) return MATCH_NONE;
		throw queryShard(`[nested] failed to find nested object under path [${path}]`);
	}
	const inner = compileQuery(ctx, options.query);
	const mode = String(options.score_mode ?? "avg");
	if (![
		"avg",
		"max",
		"min",
		"sum",
		"none"
	].includes(mode)) throw parsingError(`[nested] query does not support [${mode}] as score mode`);
	const boost = asBoost(options.boost);
	return { match: (unit) => {
		const units = unit.nested.get(path);
		if (!units) return void 0;
		const scores = [];
		for (const child of units) {
			const s = inner.match(child);
			if (s !== void 0) scores.push(s);
		}
		if (scores.length === 0) return void 0;
		switch (mode) {
			case "max": return Math.max(...scores) * boost;
			case "min": return Math.min(...scores) * boost;
			case "sum": return scores.reduce((a, b) => a + b, 0) * boost;
			case "none": return 0;
			default: return scores.reduce((a, b) => a + b, 0) / scores.length * boost;
		}
	} };
};
const compileTermLevel = (ctx, body, clause) => {
	const [name, spec] = singleField(asObject$1(body, clause), clause);
	const options = isPlainObject(spec) ? spec : { value: spec };
	if (options.value === void 0) throw parsingError(`[${clause}] query requires a value`);
	rejectOptions$1(options, [
		"value",
		"boost",
		"case_insensitive",
		"rewrite",
		"flags",
		"max_determinized_states",
		"fuzziness",
		"prefix_length",
		"max_expansions",
		"transpositions",
		"_name"
	], clause);
	const field = resolveField(ctx.index.mapping, name);
	if (!field) return MATCH_NONE;
	if (field.type === "object" || field.type === "nested") throw queryShard(`failed to create query: Can't run ${clause} query on object field [${name}]`);
	const boost = asBoost(options.boost);
	const caseInsensitive = options.case_insensitive === true;
	switch (clause) {
		case "term": return termQuery(ctx, field, options.value, boost, caseInsensitive);
		case "prefix": return prefixQuery(ctx, field, String(options.value), boost, caseInsensitive);
		case "wildcard": return wildcardQuery(ctx, field, String(options.value), boost, caseInsensitive);
		case "regexp": return regexpQuery(ctx, field, String(options.value), boost, caseInsensitive);
		case "fuzzy": return fuzzyQuery(ctx, field, String(options.value), boost, {
			fuzziness: options.fuzziness,
			prefixLength: options.prefix_length === void 0 ? void 0 : Number(options.prefix_length),
			transpositions: options.transpositions === void 0 ? void 0 : options.transpositions !== false
		});
	}
};
const compileTerms = (ctx, body) => {
	const options = asObject$1(body, "terms");
	const boost = asBoost(options.boost);
	const entries = Object.entries(options).filter(([key]) => key !== "boost" && key !== "_name");
	if (entries.length !== 1) throw parsingError("[terms] query does not support multiple fields");
	const [name, values] = entries[0];
	if (!Array.isArray(values)) throw unsupported("the terms lookup form of the \"terms\" query");
	const field = resolveField(ctx.index.mapping, name);
	if (!field) return MATCH_NONE;
	return termsQuery(ctx, field, values, boost);
};
const compileRange = (ctx, body) => {
	const [name, spec] = singleField(asObject$1(body, "range"), "range");
	const options = asObject$1(spec, "range");
	rejectOptions$1(options, [
		"gt",
		"gte",
		"lt",
		"lte",
		"from",
		"to",
		"include_lower",
		"include_upper",
		"boost",
		"format",
		"relation",
		"time_zone",
		"_name"
	], "range");
	if (options.relation !== void 0) throw unsupported("the \"relation\" option of the \"range\" query");
	if (options.time_zone !== void 0) throw unsupported("the \"time_zone\" option of the \"range\" query");
	const bounds = {
		gt: options.gt,
		gte: options.gte,
		lt: options.lt,
		lte: options.lte
	};
	if (options.from !== void 0 && options.from !== null) {
		if (options.include_lower === false) bounds.gt = options.from;
		else bounds.gte = options.from;
	}
	if (options.to !== void 0 && options.to !== null) {
		if (options.include_upper === false) bounds.lt = options.to;
		else bounds.lte = options.to;
	}
	if (options.format !== void 0) bounds.format = String(options.format);
	const field = resolveField(ctx.index.mapping, name);
	if (!field) return MATCH_NONE;
	if (field.type === "object" || field.type === "nested") throw queryShard(`failed to create query: Can't run range query on object field [${name}]`);
	return rangeQuery(ctx, field, bounds, asBoost(options.boost));
};
const UNSUPPORTED_QUERIES = [
	"function_score",
	"script",
	"script_score",
	"more_like_this",
	"percolate",
	"knn",
	"neural",
	"rank_feature",
	"pinned",
	"has_child",
	"has_parent",
	"parent_id",
	"boosting",
	"intervals",
	"wrapper",
	"terms_set",
	"combined_fields",
	"distance_feature",
	"geo_bounding_box",
	"geo_distance",
	"geo_polygon",
	"geo_shape",
	"shape",
	"span_term",
	"span_near",
	"span_or",
	"span_not",
	"span_first",
	"span_multi",
	"span_containing",
	"span_within",
	"span_field_masking",
	"hybrid",
	"template",
	"type"
];
const compileQuery = (ctx, body) => {
	if (body === void 0 || body === null) return matchAll(1);
	if (!isPlainObject(body)) throw parsingError("[query] malformed query, expected an object");
	const entries = Object.entries(body);
	if (entries.length === 0) throw parsingError("query malformed, empty clause found");
	if (entries.length > 1) throw parsingError(`[${entries[0][0]}] malformed query, expected [END_OBJECT] but found [FIELD_NAME]`);
	const [clause, spec] = entries[0];
	switch (clause) {
		case "match_all": {
			const options = asObject$1(spec ?? {}, clause);
			rejectOptions$1(options, ["boost", "_name"], clause);
			return matchAll(asBoost(options.boost));
		}
		case "match_none": return MATCH_NONE;
		case "ids": {
			const options = asObject$1(spec, clause);
			rejectOptions$1(options, [
				"values",
				"boost",
				"_name"
			], clause);
			const ids = new Set(asQueryList(options.values).map(String));
			const boost = asBoost(options.boost);
			return { match: (unit) => ids.has(unit.root.id) ? boost : void 0 };
		}
		case "exists": {
			const options = asObject$1(spec, clause);
			rejectOptions$1(options, [
				"field",
				"boost",
				"_name"
			], clause);
			if (typeof options.field !== "string") throw parsingError("[exists] requires a field");
			return existsQuery(ctx, options.field, asBoost(options.boost));
		}
		case "term":
		case "prefix":
		case "wildcard":
		case "regexp":
		case "fuzzy": return compileTermLevel(ctx, spec, clause);
		case "terms": return compileTerms(ctx, spec);
		case "range": return compileRange(ctx, spec);
		case "match":
		case "match_phrase":
		case "match_phrase_prefix":
		case "match_bool_prefix": return compileMatchLike(ctx, spec, clause);
		case "multi_match": return compileMultiMatch(ctx, spec);
		case "bool": return compileBool(ctx, spec);
		case "constant_score": {
			const options = asObject$1(spec, clause);
			rejectOptions$1(options, [
				"filter",
				"boost",
				"_name"
			], clause);
			if (options.filter === void 0) throw parsingError("[constant_score] requires a 'filter' element");
			return filtered(compileQuery(ctx, options.filter), asBoost(options.boost));
		}
		case "dis_max": {
			const options = asObject$1(spec, clause);
			rejectOptions$1(options, [
				"queries",
				"tie_breaker",
				"boost",
				"_name"
			], clause);
			const queries = asQueryList(options.queries).map((q) => compileQuery(ctx, q));
			return disMaxQuery(queries, Number(options.tie_breaker ?? 0), asBoost(options.boost));
		}
		case "nested": return compileNested(ctx, spec);
		case "query_string": return compileQueryString(ctx, spec, false);
		case "simple_query_string": return compileQueryString(ctx, spec, true);
		default:
			if (UNSUPPORTED_QUERIES.includes(clause)) throw unsupported(`the "${clause}" query`);
			throw parsingError(`unknown query [${clause}]`);
	}
};
const compileQueryString = (ctx, body, simple) => {
	const clause = simple ? "simple_query_string" : "query_string";
	const options = asObject$1(body, clause);
	rejectOptions$1(options, [
		"query",
		"fields",
		"default_field",
		"default_operator",
		"analyzer",
		"analyze_wildcard",
		"allow_leading_wildcard",
		"fuzziness",
		"fuzzy_transpositions",
		"fuzzy_prefix_length",
		"fuzzy_max_expansions",
		"lenient",
		"boost",
		"minimum_should_match",
		"tie_breaker",
		"type",
		"flags",
		"quote_field_suffix",
		"phrase_slop",
		"auto_generate_synonyms_phrase_query",
		"_name"
	], clause);
	if (typeof options.query !== "string") throw parsingError(`[${clause}] requires query value`);
	if (options.type !== void 0 && !["best_fields", "most_fields"].includes(String(options.type))) throw unsupported(`the "${String(options.type)}" ${clause} type`);
	const fieldSpecs = options.fields ?? (options.default_field === void 0 ? void 0 : [options.default_field]);
	const { fields, lenient } = expandFields(ctx, fieldSpecs, options.lenient === true);
	const defaultOperator = String(options.default_operator ?? "or").toLowerCase();
	if (defaultOperator !== "and" && defaultOperator !== "or") throw parsingError(`[${clause}] default operator [${defaultOperator}] is not valid`);
	const settings = {
		fields,
		lenient,
		defaultOperator,
		fuzziness: options.fuzziness ?? "AUTO",
		transpositions: options.fuzzy_transpositions !== false,
		prefixLength: Number(options.fuzzy_prefix_length ?? 0),
		analyzeWildcard: options.analyze_wildcard === true,
		allowLeadingWildcard: options.allow_leading_wildcard !== false,
		tieBreaker: options.tie_breaker === void 0 ? options.type === "most_fields" ? 1 : 0 : Number(options.tie_breaker),
		analyzer: options.analyzer === void 0 ? void 0 : String(options.analyzer)
	};
	let clauses;
	try {
		clauses = simple ? parseSimpleQueryString(options.query, defaultOperator) : parseQueryString(options.query, defaultOperator);
	} catch (error) {
		if (error instanceof Error && !("status" in error)) throw queryShard(`Failed to parse query [${options.query}]`);
		throw error;
	}
	const query = compileStringClauses(ctx, clauses, settings, options.minimum_should_match);
	const boost = asBoost(options.boost);
	return boost === 1 ? query : { match: (unit) => scale(query.match(unit), boost) };
};
const scale = (score, boost) => score === void 0 ? void 0 : score * boost;
const compileStringClauses = (ctx, clauses, settings, msm) => {
	const must = [];
	const should = [];
	const mustNot = [];
	for (const clause of clauses) {
		const query = compileStringNode(ctx, clause.node, settings);
		if (clause.occur === "must") must.push(query);
		else if (clause.occur === "must_not") mustNot.push(query);
		else should.push(query);
	}
	return boolQuery({
		must,
		filter: [],
		should,
		mustNot,
		minimumShouldMatch: msm
	});
};
const perField = (ctx, node, settings, build) => {
	const targets = [];
	if (node.field) {
		const field = resolveField(ctx.index.mapping, node.field);
		if (!field) {
			if (settings.lenient || node.field.includes("*")) for (const f of matchFieldPattern(node.field, ctx.leafFields)) targets.push({
				field: f,
				boost: 1
			});
			if (targets.length === 0) return MATCH_NONE;
		} else targets.push({
			field,
			boost: 1
		});
	} else targets.push(...settings.fields);
	const queries = [];
	for (const { field, boost } of targets) {
		if (field.type === "object" || field.type === "nested") continue;
		try {
			queries.push(build(field, boost * (node.boost ?? 1)));
		} catch (error) {
			if (!settings.lenient) throw error;
		}
	}
	if (queries.length === 0) return MATCH_NONE;
	if (queries.length === 1) return queries[0];
	return disMaxQuery(queries, settings.tieBreaker, 1);
};
const hasWildcard = (text) => /(^|[^\\])[*?]/.test(text);
const analyzedWildcard = (ctx, field, text, settings) => {
	if (field.type !== "text") return text;
	const masked = text.replace(/\*/g, "ZZSTARZZ").replace(/\?/g, "ZZQMARKZZ");
	const tokens = settings.analyzer ? ctx.index.analysis.analyzer(settings.analyzer)(masked) : searchAnalyzerOf(ctx.index, field)(masked);
	return (tokens.length === 0 ? masked.toLowerCase() : tokens.join(" ")).replace(/zzstarzz/gi, "*").replace(/zzqmarkzz/gi, "?");
};
const compileStringNode = (ctx, node, settings) => {
	switch (node.kind) {
		case "all": return matchAll(node.boost ?? 1);
		case "exists": return existsQuery(ctx, node.field, node.boost ?? 1);
		case "group": {
			const inner = compileStringClauses(ctx, node.clauses.map((c) => ({
				...c,
				node: node.field && !c.node.field ? {
					...c.node,
					field: node.field
				} : c.node
			})), settings);
			return node.boost === void 0 ? inner : { match: (unit) => scale(inner.match(unit), node.boost) };
		}
		case "phrase": return perField(ctx, node, settings, (field, boost) => phraseQuery(ctx, field, node.text, boost, node.slop ?? 0, false, settings.analyzer));
		case "range": return perField(ctx, node, settings, (field, boost) => rangeQuery(ctx, field, node.bounds, boost));
		case "term": return perField(ctx, node, settings, (field, boost) => {
			if (hasWildcard(node.text)) {
				if (!settings.allowLeadingWildcard && /^[*?]/.test(node.text)) throw queryShard(`Failed to parse query [${node.text}]: '*' or '?' not allowed as first character in WildcardQuery`);
				if (field.type === "text" || field.type === "keyword") {
					const pattern = analyzedWildcard(ctx, field, node.text, settings);
					if (pattern === "*") return existsQuery(ctx, field.path, boost);
					return wildcardQuery(ctx, field, pattern, boost);
				}
				throw queryShard(`Can only use wildcard queries on keyword and text fields - not on [${field.path}] which is of type [${field.type}]`);
			}
			if (node.fuzzy !== void 0) {
				const fuzziness = node.fuzzy === "auto" ? settings.fuzziness : node.fuzzy;
				if (field.type === "text") return matchQuery(ctx, field, node.text, boost, {
					operator: settings.defaultOperator,
					fuzziness,
					prefixLength: settings.prefixLength,
					transpositions: settings.transpositions,
					analyzer: settings.analyzer
				});
				if (field.type === "keyword") return fuzzyQuery(ctx, field, node.text, boost, {
					fuzziness,
					prefixLength: settings.prefixLength,
					transpositions: settings.transpositions
				});
				return termQuery(ctx, field, node.text, boost);
			}
			return matchQuery(ctx, field, node.text, boost, {
				operator: settings.defaultOperator,
				lenient: settings.lenient,
				analyzer: settings.analyzer
			});
		});
	}
};
//#endregion
//#region src/engine/painless.ts
var DocField = class {
	values;
	constructor(values) {
		this.values = values;
	}
};
var ParamsBag = class {
	params;
	constructor(params) {
		this.params = params;
	}
};
const OPERATORS = [
	"&&",
	"||",
	"==",
	"!=",
	"<=",
	">=",
	"?",
	":",
	"!",
	"<",
	">",
	"+",
	"-",
	"*",
	"/",
	"%",
	"(",
	")",
	"[",
	"]",
	".",
	",",
	";"
];
const REJECTED_BEFORE = [
	"<<<",
	">>>",
	"<<",
	">>",
	"++",
	"--",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"===",
	"!==",
	"?:",
	"->",
	"::"
];
const REJECTED_AFTER = [
	"&",
	"|",
	"^",
	"~",
	"=",
	"{",
	"}"
];
const tokenize = (source) => {
	const tokens = [];
	let i = 0;
	while (i < source.length) {
		const char = source[i];
		if (/\s/.test(char)) {
			i++;
			continue;
		}
		if (/[0-9]/.test(char) || char === "." && /[0-9]/.test(source[i + 1] ?? "")) {
			const match = /^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?[lLfFdD]?/.exec(source.slice(i));
			tokens.push({
				kind: "number",
				value: Number.parseFloat(match[0].replace(/[lLfFdD]$/, ""))
			});
			i += match[0].length;
			continue;
		}
		if (char === "'" || char === "\"") {
			let j = i + 1;
			let text = "";
			while (j < source.length && source[j] !== char) {
				if (source[j] === "\\") j++;
				text += source[j];
				j++;
			}
			if (j >= source.length) throw illegalArgument(`Unterminated string in script: ${source}`);
			tokens.push({
				kind: "string",
				value: text
			});
			i = j + 1;
			continue;
		}
		if (/[A-Za-z_$]/.test(char)) {
			const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(i));
			tokens.push({
				kind: "name",
				value: match[0]
			});
			i += match[0].length;
			continue;
		}
		const rejected = REJECTED_BEFORE.find((candidate) => source.startsWith(candidate, i)) ?? (OPERATORS.some((candidate) => source.startsWith(candidate, i)) ? void 0 : REJECTED_AFTER.find((candidate) => source.startsWith(candidate, i)));
		if (rejected) throw unsupported(`the "${rejected}" operator in scripts`);
		const op = OPERATORS.find((candidate) => source.startsWith(candidate, i));
		if (!op) throw unsupported(`the "${char}" character in scripts`);
		tokens.push({
			kind: "op",
			value: op
		});
		i += op.length;
	}
	tokens.push({ kind: "end" });
	return tokens;
};
const truthy = (value) => {
	if (typeof value !== "boolean") throw illegalArgument("Script conditions must evaluate to a boolean");
	return value;
};
const number = (value, what) => {
	if (typeof value === "number") return value;
	if (typeof value === "boolean") return value ? 1 : 0;
	throw illegalArgument(`Script operator ${what} needs numbers, got ${describe(value)}`);
};
const describe = (value) => {
	if (value === null) return "null";
	if (value instanceof DocField) return "doc field";
	if (value instanceof ParamsBag) return "params";
	if (Array.isArray(value)) return "list";
	return typeof value;
};
const equal = (a, b) => {
	if (a instanceof DocField || b instanceof DocField) throw illegalArgument("Compare doc['field'].value, not the field itself");
	return a === b;
};
const contains = (list, value) => list.some((entry) => equal(entry, value));
const member = (target, name, args, source) => {
	if (target instanceof ParamsBag) {
		if (args) throw unsupported(`calling "${name}" on params`);
		const value = target.params[name];
		return value === void 0 ? null : value;
	}
	if (target instanceof DocField) {
		switch (name) {
			case "value":
				if (args) break;
				return target.values[0] ?? null;
			case "values":
				if (args) break;
				return target.values;
			case "length":
			case "size": return target.values.length;
			case "empty":
			case "isEmpty": return target.values.length === 0;
			case "contains":
				if (args?.length !== 1) break;
				return contains(target.values, args[0]);
		}
		throw unsupported(`"${name}" on a doc field in scripts (${source})`);
	}
	if (Array.isArray(target)) {
		switch (name) {
			case "length":
			case "size": return target.length;
			case "empty":
			case "isEmpty": return target.length === 0;
			case "contains":
				if (args?.length !== 1) break;
				return contains(target, args[0]);
		}
		throw unsupported(`"${name}" on a list in scripts (${source})`);
	}
	if (typeof target === "string") {
		switch (name) {
			case "length": return target.length;
			case "isEmpty":
			case "empty": return target.length === 0;
			case "toLowerCase": return target.toLowerCase();
			case "toUpperCase": return target.toUpperCase();
			case "contains":
			case "startsWith":
			case "endsWith":
			case "equals":
				if (args?.length !== 1 || typeof args[0] !== "string") break;
				if (name === "equals") return target === args[0];
				if (name === "contains") return target.includes(args[0]);
				return name === "startsWith" ? target.startsWith(args[0]) : target.endsWith(args[0]);
		}
		throw unsupported(`"${name}" on a string in scripts (${source})`);
	}
	if (target === null) throw illegalArgument(`Cannot access "${name}" on null in script: ${source}`);
	throw unsupported(`"${name}" on a ${describe(target)} in scripts (${source})`);
};
const mathFunction = (name, args) => {
	switch (name) {
		case "max": return Math.max(...args);
		case "min": return Math.min(...args);
		case "abs": return Math.abs(args[0]);
		case "floor": return Math.floor(args[0]);
		case "ceil": return Math.ceil(args[0]);
		case "round": return Math.round(args[0]);
		case "sqrt": return Math.sqrt(args[0]);
		case "pow": return Math.pow(args[0], args[1]);
		case "log": return Math.log(args[0]);
	}
	throw unsupported(`"Math.${name}" in scripts`);
};
var Parser = class {
	tokens;
	source;
	pos = 0;
	constructor(tokens, source) {
		this.tokens = tokens;
		this.source = source;
	}
	parse() {
		if (this.isName("return")) this.pos++;
		const node = this.ternary();
		if (this.isOp(";")) this.pos++;
		if (this.peek().kind !== "end") throw unsupported(`multi-statement scripts (${this.source})`);
		return node;
	}
	peek() {
		return this.tokens[this.pos];
	}
	isOp(value) {
		const token = this.peek();
		return token.kind === "op" && token.value === value;
	}
	isName(value) {
		const token = this.peek();
		return token.kind === "name" && token.value === value;
	}
	expectOp(value) {
		if (!this.isOp(value)) throw illegalArgument(`Expected "${value}" in script: ${this.source}`);
		this.pos++;
	}
	ternary() {
		const condition = this.or();
		if (!this.isOp("?")) return condition;
		this.pos++;
		const whenTrue = this.ternary();
		this.expectOp(":");
		const whenFalse = this.ternary();
		return (scope) => truthy(condition(scope)) ? whenTrue(scope) : whenFalse(scope);
	}
	or() {
		let left = this.and();
		while (this.isOp("||")) {
			this.pos++;
			const right = this.and();
			const current = left;
			left = (scope) => truthy(current(scope)) || truthy(right(scope));
		}
		return left;
	}
	and() {
		let left = this.equality();
		while (this.isOp("&&")) {
			this.pos++;
			const right = this.equality();
			const current = left;
			left = (scope) => truthy(current(scope)) && truthy(right(scope));
		}
		return left;
	}
	equality() {
		let left = this.relational();
		while (this.isOp("==") || this.isOp("!=")) {
			const op = this.peek().value;
			this.pos++;
			const right = this.relational();
			const current = left;
			left = (scope) => op === "==" === equal(current(scope), right(scope));
		}
		return left;
	}
	relational() {
		let left = this.additive();
		while (this.isOp("<") || this.isOp("<=") || this.isOp(">") || this.isOp(">=")) {
			const op = this.peek().value;
			this.pos++;
			const right = this.additive();
			const current = left;
			left = (scope) => {
				const a = number(current(scope), op);
				const b = number(right(scope), op);
				return op === "<" ? a < b : op === "<=" ? a <= b : op === ">" ? a > b : a >= b;
			};
		}
		return left;
	}
	additive() {
		let left = this.multiplicative();
		while (this.isOp("+") || this.isOp("-")) {
			const op = this.peek().value;
			this.pos++;
			const right = this.multiplicative();
			const current = left;
			left = (scope) => {
				const a = current(scope);
				const b = right(scope);
				if (op === "+" && (typeof a === "string" || typeof b === "string")) return `${String(a)}${String(b)}`;
				return op === "+" ? number(a, op) + number(b, op) : number(a, op) - number(b, op);
			};
		}
		return left;
	}
	multiplicative() {
		let left = this.unary();
		while (this.isOp("*") || this.isOp("/") || this.isOp("%")) {
			const op = this.peek().value;
			this.pos++;
			const right = this.unary();
			const current = left;
			left = (scope) => {
				const a = number(current(scope), op);
				const b = number(right(scope), op);
				return op === "*" ? a * b : op === "/" ? a / b : a % b;
			};
		}
		return left;
	}
	unary() {
		if (this.isOp("!")) {
			this.pos++;
			const operand = this.unary();
			return (scope) => !truthy(operand(scope));
		}
		if (this.isOp("-")) {
			this.pos++;
			const operand = this.unary();
			return (scope) => -number(operand(scope), "-");
		}
		return this.postfix();
	}
	postfix() {
		let node = this.primary();
		while (true) {
			if (this.isOp(".")) {
				this.pos++;
				const token = this.peek();
				if (token.kind !== "name") throw illegalArgument(`Expected a member name in script: ${this.source}`);
				this.pos++;
				const name = token.value;
				const args = this.isOp("(") ? this.arguments() : void 0;
				const target = node;
				node = (scope) => member(target(scope), name, args?.map((arg) => arg(scope)), this.source);
				continue;
			}
			if (this.isOp("[")) {
				this.pos++;
				const key = this.ternary();
				this.expectOp("]");
				const target = node;
				node = (scope) => index(target(scope), key(scope), this.source);
				continue;
			}
			break;
		}
		return node;
	}
	arguments() {
		this.expectOp("(");
		const args = [];
		if (!this.isOp(")")) {
			args.push(this.ternary());
			while (this.isOp(",")) {
				this.pos++;
				args.push(this.ternary());
			}
		}
		this.expectOp(")");
		return args;
	}
	primary() {
		const token = this.peek();
		if (token.kind === "number") {
			this.pos++;
			return () => token.value;
		}
		if (token.kind === "string") {
			this.pos++;
			return () => token.value;
		}
		if (token.kind === "op" && token.value === "(") {
			this.pos++;
			const inner = this.ternary();
			this.expectOp(")");
			return inner;
		}
		if (token.kind === "name") {
			this.pos++;
			switch (token.value) {
				case "true": return () => true;
				case "false": return () => false;
				case "null": return () => null;
				case "params": return (scope) => new ParamsBag(scope.params);
				case "doc": {
					this.expectOp("[");
					const key = this.ternary();
					this.expectOp("]");
					return (scope) => {
						const name = key(scope);
						if (typeof name !== "string") throw illegalArgument(`doc[] needs a field name in script: ${this.source}`);
						return new DocField(scope.field(name));
					};
				}
				case "Math": {
					this.expectOp(".");
					const name = this.peek();
					if (name.kind !== "name") throw illegalArgument(`Expected a Math function in script: ${this.source}`);
					this.pos++;
					const args = this.arguments();
					return (scope) => mathFunction(name.value, args.map((arg) => number(arg(scope), `Math.${name.value}`)));
				}
			}
			throw unsupported(`the "${token.value}" identifier in scripts (${this.source})`);
		}
		throw illegalArgument(`Unexpected token in script: ${this.source}`);
	}
};
const index = (target, key, source) => {
	if (Array.isArray(target)) {
		if (typeof key !== "number") throw illegalArgument(`List index must be a number in script: ${source}`);
		return target[key] ?? null;
	}
	if (target instanceof ParamsBag) {
		if (typeof key !== "string") throw illegalArgument(`params key must be a string in script: ${source}`);
		const value = target.params[key];
		return value === void 0 ? null : value;
	}
	throw unsupported(`indexing a ${describe(target)} in scripts (${source})`);
};
const cache = /* @__PURE__ */ new Map();
const compileScript = (source) => {
	const cached = cache.get(source);
	if (cached) return cached;
	const node = new Parser(tokenize(source), source).parse();
	cache.set(source, node);
	return node;
};
//#endregion
//#region src/engine/sort.ts
const LONG_MAX = 2 ** 63;
const LONG_MIN = -(2 ** 63);
const parseSort = (sort) => {
	if (sort === void 0 || sort === null) return [];
	const list = Array.isArray(sort) ? sort : [sort];
	const specs = [];
	for (const entry of list) {
		if (typeof entry === "string") {
			const [field, order] = entry.split(":");
			specs.push(makeSpec(field, { order }));
			continue;
		}
		if (!isPlainObject(entry)) throw illegalArgument("sort entries must be strings or objects");
		for (const [field, options] of Object.entries(entry)) {
			if (field === "_script") {
				specs.push(makeScriptSpec(options));
				continue;
			}
			if (field === "_geo_distance") throw unsupported("geo distance sorting");
			specs.push(makeSpec(field, isPlainObject(options) ? options : { order: options }));
		}
	}
	return specs;
};
const makeScriptSpec = (options) => {
	if (!isPlainObject(options)) throw illegalArgument("_script sort needs an object");
	for (const key of Object.keys(options)) if (![
		"type",
		"order",
		"script",
		"mode",
		"nested"
	].includes(key)) throw unsupported(`the "${key}" _script sort option`);
	if (options.nested !== void 0) throw unsupported("nested script sorting");
	if (options.mode !== void 0) throw unsupported("the \"mode\" _script sort option");
	const type = options.type === void 0 ? void 0 : String(options.type);
	if (type !== "number" && type !== "string") throw illegalArgument(`_script sort needs a type of "number" or "string", got [${String(options.type)}]`);
	const script = options.script;
	if (!isPlainObject(script)) throw illegalArgument("_script sort needs a script object");
	if (script.lang !== void 0 && script.lang !== "painless") throw unsupported(`the "${String(script.lang)}" script language`);
	if (script.id !== void 0) throw unsupported("stored scripts");
	const source = script.source ?? script.inline;
	if (typeof source !== "string") throw illegalArgument("_script sort needs a script source");
	const params = isPlainObject(script.params) ? script.params : {};
	const spec = makeSpec("_script", { order: options.order });
	spec.script = {
		run: compileScript(source),
		type,
		params
	};
	return spec;
};
const makeSpec = (field, options) => {
	for (const key of Object.keys(options)) if (![
		"order",
		"missing",
		"mode",
		"unmapped_type",
		"numeric_type",
		"format",
		"nested",
		"nested_path",
		"nested_filter"
	].includes(key)) throw unsupported(`the "${key}" sort option`);
	if (options.nested !== void 0 || options.nested_path !== void 0 || options.nested_filter !== void 0) throw unsupported("nested sorting");
	const order = options.order === void 0 ? field === "_score" ? "desc" : "asc" : String(options.order).toLowerCase();
	if (order !== "asc" && order !== "desc") throw illegalArgument(`No value for order [${String(options.order)}]`);
	const mode = options.mode === void 0 ? void 0 : String(options.mode);
	if (mode !== void 0 && ![
		"min",
		"max",
		"avg",
		"sum",
		"median"
	].includes(mode)) throw illegalArgument(`Unknown sort mode [${mode}]`);
	return {
		field,
		order,
		missing: options.missing ?? "_last",
		mode,
		unmappedType: options.unmapped_type === void 0 ? void 0 : String(options.unmapped_type)
	};
};
const TEXT_SORT_ERROR = "Text fields are not optimised for operations that require per-document field data like aggregations and sorting, so these operations are disabled by default. Please use a keyword field instead. Alternatively, set fielddata=true on [FIELD] in order to load field data by uninverting the inverted index. Note that this can use significant memory.";
const requireSortableField = (ctx, name, unmappedType) => {
	const field = resolveField(ctx.index.mapping, name);
	if (!field) {
		if (unmappedType !== void 0) return void 0;
		throw queryShard(`No mapping found for [${name}] in order to sort on`);
	}
	if (field.type === "object" || field.type === "nested") throw illegalArgument(`Fielddata is not supported on field [${name}] of type [${field.type}]`);
	if (field.type === "text" && field.mapping.fielddata !== true) throw illegalArgument(TEXT_SORT_ERROR.replace("FIELD", name));
	return field;
};
const comparableValues = (doc, field) => {
	const values = doc.fields.get(field.path) ?? [];
	const out = [];
	for (const value of values) if (value instanceof TextValue) out.push(...value.tokens);
	else out.push(value);
	return out;
};
const reduce = (values, mode, order) => {
	if (values.length === 0) return null;
	const numbers = values.map((v) => typeof v === "boolean" ? v ? 1 : 0 : v);
	const effective = mode ?? (order === "asc" ? "min" : "max");
	if (typeof numbers[0] === "string") {
		const strings = numbers.map(String).toSorted();
		if (effective === "max") return strings[strings.length - 1];
		if (effective === "min") return strings[0];
		throw illegalArgument(`Sort mode [${effective}] is not supported on string fields`);
	}
	const list = numbers.toSorted((a, b) => a - b);
	switch (effective) {
		case "min": return list[0];
		case "max": return list[list.length - 1];
		case "sum": return list.reduce((a, b) => a + b, 0);
		case "avg": return list.reduce((a, b) => a + b, 0) / list.length;
		case "median": {
			const mid = Math.floor(list.length / 2);
			return list.length % 2 === 0 ? (list[mid - 1] + list[mid]) / 2 : list[mid];
		}
	}
};
const scriptFieldValues = (ctx, doc) => (name) => {
	const field = resolveField(ctx.index.mapping, name);
	if (!field) throw illegalArgument(`No field found for [${name}] in mapping`);
	if (field.type === "object" || field.type === "nested") throw illegalArgument(`Fielddata is not supported on field [${name}] of type [${field.type}]`);
	if (field.type === "text" && field.mapping.fielddata !== true) throw illegalArgument(TEXT_SORT_ERROR.replace("FIELD", name));
	return comparableValues(doc, field);
};
const scriptSortValue = (ctx, doc, spec) => {
	const { run, type, params } = spec.script;
	const result = run({
		field: scriptFieldValues(ctx, doc),
		params
	});
	if (result === null) return null;
	if (result instanceof DocField) throw illegalArgument("A script sort must return a value, not doc['field']");
	if (Array.isArray(result) || typeof result === "object") throw illegalArgument("A script sort must return a number or string");
	if (type === "string") return String(result);
	if (typeof result === "boolean") return result ? 1 : 0;
	if (typeof result === "string") throw illegalArgument(`A script sort of type number returned the string [${result}]`);
	return result;
};
const sortValueOf = (ctx, doc, score, spec) => {
	if (spec.field === "_score") return score;
	if (spec.field === "_doc") return doc.order;
	if (spec.script) return scriptSortValue(ctx, doc, spec);
	const field = requireSortableField(ctx, spec.field, spec.unmappedType);
	if (!field) return null;
	const value = reduce(comparableValues(doc, field), spec.mode, spec.order);
	if (value !== null) return value;
	if (spec.missing !== "_first" && spec.missing !== "_last") {
		const missing = spec.missing;
		if (typeof missing === "number" || typeof missing === "string" || typeof missing === "boolean") return missing;
	}
	return null;
};
const compareValues = (a, b, spec) => {
	if (a === null && b === null) return 0;
	if (a === null) return spec.missing === "_first" ? -1 : 1;
	if (b === null) return spec.missing === "_first" ? 1 : -1;
	const direction = spec.order === "asc" ? 1 : -1;
	if (typeof a === "number" && typeof b === "number") return (a - b) * direction;
	const as = String(a);
	const bs = String(b);
	return (as < bs ? -1 : as > bs ? 1 : 0) * direction;
};
const compareHits = (a, b, specs) => {
	for (let i = 0; i < specs.length; i++) {
		const result = compareValues(a.sort[i] ?? null, b.sort[i] ?? null, specs[i]);
		if (result !== 0) return result;
	}
	return 0;
};
const defaultCompare = (a, b) => {
	if (a.score !== b.score) return b.score - a.score;
	if (a.doc.index !== b.doc.index) return a.doc.index < b.doc.index ? -1 : 1;
	return a.doc.order - b.doc.order;
};
const normalizeSearchAfter = (values, specs) => {
	if (!Array.isArray(values)) throw illegalArgument("search_after must be an array");
	if (specs.length === 0) throw illegalArgument("Sort must contain at least one field when using search_after");
	if (values.length !== specs.length) throw illegalArgument(`search_after has ${values.length} value(s) but sort has ${specs.length}.`);
	return values.map((value, i) => {
		const spec = specs[i];
		if (value === null || value === void 0) return null;
		if (typeof value === "number") {
			if (spec.field !== "_score" && spec.field !== "_doc" && Math.abs(value) >= 0x7facf7419d980000) return null;
			return value;
		}
		if (typeof value === "string" || typeof value === "boolean") return value;
		throw illegalArgument(`Unsupported search_after value [${String(value)}]`);
	});
};
const isAfter = (hit, cursor, specs) => {
	for (let i = 0; i < specs.length; i++) {
		const result = compareValues(hit.sort[i] ?? null, cursor[i] ?? null, specs[i]);
		if (result !== 0) return result > 0;
	}
	return false;
};
const renderSortValue = (ctx, value, spec) => {
	if (value !== null) return typeof value === "boolean" ? value ? 1 : 0 : value;
	if (spec.field === "_score" || spec.field === "_doc" || spec.script) return null;
	const field = resolveField(ctx.index.mapping, spec.field);
	if (!(field ? isNumericType(field.type) || field.type === "date" || field.type === "boolean" : spec.unmappedType !== "keyword")) return null;
	const last = spec.missing !== "_first";
	return spec.order === "asc" === last ? LONG_MAX : LONG_MIN;
};
//#endregion
//#region src/engine/aggs.ts
const METRIC_AGGS = [
	"min",
	"max",
	"sum",
	"avg",
	"value_count",
	"cardinality",
	"stats"
];
const BUCKET_AGGS = [
	"terms",
	"filter",
	"filters",
	"range",
	"date_range",
	"histogram",
	"date_histogram",
	"nested",
	"reverse_nested",
	"global",
	"top_hits"
];
const fieldOf = (agg, unit, name) => {
	const ctx = agg.contextFor(unit.root.index);
	const field = resolveField(ctx.index.mapping, name);
	if (!field) return void 0;
	requireSortableField(ctx, name, "keyword");
	return field;
};
const valuesOf = (agg, unit, name) => {
	const field = fieldOf(agg, unit, name);
	return field ? comparableValues(unit, field) : [];
};
const numbersOf = (agg, unit, name, missing) => {
	const values = valuesOf(agg, unit, name);
	if (values.length === 0) return missing === void 0 ? [] : [Number(missing)];
	return values.map((v) => typeof v === "boolean" ? v ? 1 : 0 : typeof v === "string" ? Number(v) : v).filter((n) => !Number.isNaN(n));
};
const fieldTypeIn = (agg, units, name) => {
	for (const unit of units) {
		const field = fieldOf(agg, unit, name);
		if (field) return field.type;
	}
};
const asObject = (value, what) => {
	if (!isPlainObject(value)) throw parsingError(`[${what}] must be an object`);
	return value;
};
const rejectOptions = (options, allowed, type) => {
	for (const key of Object.keys(options)) if (!allowed.includes(key)) throw unsupported(`the "${key}" option of the "${type}" aggregation`);
};
const requireField = (options, type) => {
	if (options.script !== void 0) throw unsupported(`scripts in the "${type}" aggregation`);
	if (typeof options.field !== "string") throw illegalArgument(`Required [field] for [${type}] aggregation`);
	return options.field;
};
const runAggregations = (agg, spec, units) => {
	const aggs = asObject(spec, "aggregations");
	const result = {};
	for (const [name, definition] of Object.entries(aggs)) {
		const body = asObject(definition, name);
		const subAggs = body.aggs ?? body.aggregations;
		const types = Object.keys(body).filter((key) => key !== "aggs" && key !== "aggregations" && key !== "meta");
		if (types.length !== 1) throw parsingError(`Found [${types.length}] aggregation types in [${name}], expected exactly one`);
		const type = types[0];
		const options = asObject(body[type], type);
		if (METRIC_AGGS.includes(type)) {
			if (subAggs !== void 0) throw illegalArgument(`Aggregator [${name}] of type [${type}] cannot accept sub-aggregations`);
			result[name] = runMetric(agg, type, options, units);
		} else if (BUCKET_AGGS.includes(type)) result[name] = runBucket(agg, type, options, units, subAggs);
		else throw unsupported(`the "${type}" aggregation`);
	}
	return result;
};
const withDate = (value, isDate) => {
	return isDate && value !== null ? {
		value,
		value_as_string: formatDate(value)
	} : { value };
};
const runMetric = (agg, type, options, units) => {
	rejectOptions(options, [
		"field",
		"missing",
		"script",
		"format",
		"precision_threshold"
	], type);
	const field = requireField(options, type);
	const isDate = fieldTypeIn(agg, units, field) === "date";
	if (type === "value_count") {
		let count = 0;
		for (const unit of units) count += valuesOf(agg, unit, field).length || (options.missing === void 0 ? 0 : 1);
		return { value: count };
	}
	if (type === "cardinality") {
		const seen = /* @__PURE__ */ new Set();
		for (const unit of units) {
			const values = valuesOf(agg, unit, field);
			if (values.length === 0 && options.missing !== void 0) seen.add(options.missing);
			for (const value of values) seen.add(value);
		}
		return { value: seen.size };
	}
	const numbers = [];
	for (const unit of units) numbers.push(...numbersOf(agg, unit, field, options.missing));
	const sum = numbers.reduce((a, b) => a + b, 0);
	const min = numbers.length ? Math.min(...numbers) : null;
	const max = numbers.length ? Math.max(...numbers) : null;
	const avg = numbers.length ? sum / numbers.length : null;
	switch (type) {
		case "min": return withDate(min, isDate);
		case "max": return withDate(max, isDate);
		case "sum": return withDate(sum, isDate);
		case "avg": return withDate(avg, isDate);
		default: return isDate ? {
			count: numbers.length,
			min,
			max,
			avg,
			sum,
			min_as_string: min === null ? null : formatDate(min),
			max_as_string: max === null ? null : formatDate(max),
			avg_as_string: avg === null ? null : formatDate(avg),
			sum_as_string: formatDate(sum)
		} : {
			count: numbers.length,
			min,
			max,
			avg,
			sum
		};
	}
};
const subResults = (agg, subAggs, units) => {
	return subAggs === void 0 ? {} : runAggregations(agg, subAggs, units);
};
const compileFilter = (agg, query) => {
	const cache = /* @__PURE__ */ new Map();
	return (unit) => {
		const index = unit.root.index;
		let compiled = cache.get(index);
		if (!compiled) {
			compiled = compileQuery(agg.contextFor(index), query);
			cache.set(index, compiled);
		}
		return compiled.match(unit) !== void 0;
	};
};
const bucketKeyOf = (value, type) => {
	if (type === "boolean") return {
		key: value ? 1 : 0,
		key_as_string: value ? "true" : "false"
	};
	if (type === "date" && typeof value === "number") return {
		key: value,
		key_as_string: formatDate(value)
	};
	return { key: value };
};
const readOrder = (order) => {
	if (order === void 0) return [["_count", "desc"], ["_key", "asc"]];
	const list = Array.isArray(order) ? order : [order];
	const result = [];
	for (const entry of list) for (const [key, direction] of Object.entries(asObject(entry, "order"))) {
		const dir = String(direction).toLowerCase();
		if (dir !== "asc" && dir !== "desc") throw parsingError(`Unknown terms order direction [${dir}]`);
		result.push([key, dir]);
	}
	if (!result.some(([key]) => key === "_key")) result.push(["_key", "asc"]);
	return result;
};
const orderValue = (bucket, rendered, key) => {
	if (key === "_count") return bucket.doc_count;
	if (key === "_key" || key === "_term") return bucket.key;
	const [aggName, metric = "value"] = key.split(".");
	const sub = rendered[aggName];
	if (!isPlainObject(sub)) throw illegalArgument(`Invalid aggregation order path [${key}]`);
	const value = sub[metric];
	if (typeof value !== "number") throw illegalArgument(`Invalid aggregation order path [${key}]. Buckets can only be sorted on a sub-aggregator path`);
	return value;
};
const compareScalars = (a, b) => {
	if (typeof a === "number" && typeof b === "number") return a - b;
	const as = String(a);
	const bs = String(b);
	return as < bs ? -1 : as > bs ? 1 : 0;
};
const renderBuckets = (agg, buckets, subAggs) => {
	return buckets.map((bucket) => ({
		key: bucket.key,
		...bucket.key_as_string !== void 0 ? { key_as_string: bucket.key_as_string } : {},
		doc_count: bucket.doc_count,
		...subResults(agg, subAggs, bucket.units)
	}));
};
const runTerms = (agg, options, units, subAggs) => {
	rejectOptions(options, [
		"field",
		"size",
		"order",
		"min_doc_count",
		"missing",
		"include",
		"exclude",
		"shard_size",
		"show_term_doc_count_error",
		"script",
		"collect_mode",
		"execution_hint",
		"shard_min_doc_count"
	], "terms");
	const field = requireField(options, "terms");
	const size = Number(options.size ?? 10);
	const minDocCount = Number(options.min_doc_count ?? 1);
	const type = fieldTypeIn(agg, units, field);
	const include = options.include === void 0 ? void 0 : Array.isArray(options.include) ? new Set(options.include.map(String)) : unsupportedInclude("include");
	const exclude = options.exclude === void 0 ? void 0 : Array.isArray(options.exclude) ? new Set(options.exclude.map(String)) : unsupportedInclude("exclude");
	const groups = /* @__PURE__ */ new Map();
	for (const unit of units) {
		let values = valuesOf(agg, unit, field);
		if (values.length === 0 && options.missing !== void 0) values = [options.missing];
		const seen = /* @__PURE__ */ new Set();
		for (const value of values) {
			const id = `${typeof value}:${String(value)}`;
			if (seen.has(id)) continue;
			seen.add(id);
			if (include && !include.has(String(value))) continue;
			if (exclude && exclude.has(String(value))) continue;
			let bucket = groups.get(id);
			if (!bucket) {
				bucket = {
					...bucketKeyOf(value, type),
					doc_count: 0,
					units: []
				};
				groups.set(id, bucket);
			}
			bucket.doc_count++;
			bucket.units.push(unit);
		}
	}
	const order = readOrder(options.order);
	const rendered = /* @__PURE__ */ new Map();
	const needsSub = order.some(([key]) => key !== "_count" && key !== "_key" && key !== "_term");
	const all = [...groups.values()].filter((b) => b.doc_count >= minDocCount);
	if (needsSub) for (const bucket of all) rendered.set(bucket, subResults(agg, subAggs, bucket.units));
	all.sort((a, b) => {
		for (const [key, direction] of order) {
			const result = compareScalars(orderValue(a, rendered.get(a) ?? {}, key), orderValue(b, rendered.get(b) ?? {}, key));
			if (result !== 0) return direction === "asc" ? result : -result;
		}
		return 0;
	});
	const top = all.slice(0, size);
	return {
		doc_count_error_upper_bound: 0,
		sum_other_doc_count: all.slice(size).reduce((sum, b) => sum + b.doc_count, 0),
		buckets: renderBuckets(agg, top, subAggs)
	};
};
const unsupportedInclude = (what) => {
	throw unsupported(`regular expressions or partitions in the terms "${what}" option (use an exact array)`);
};
const rangeBuckets = (agg, options, units, subAggs, isDate) => {
	const field = requireField(options, isDate ? "date_range" : "range");
	const ranges = options.ranges;
	if (!Array.isArray(ranges)) throw parsingError("[ranges] must be an array");
	const keyed = options.keyed === true;
	const bound = (value, roundUp) => {
		if (value === void 0 || value === null) return void 0;
		if (isDate) {
			if (typeof value === "number") return value;
			const format = options.format === void 0 ? void 0 : String(options.format);
			return parseDateMath(String(value), parseDateFormat(format), roundUp, agg.contextFor(units[0]?.root.index ?? "").now);
		}
		return Number(value);
	};
	const buckets = ranges.map((entry) => {
		const range = asObject(entry, "range");
		const from = bound(range.from, false);
		const to = bound(range.to, false);
		const label = (v) => v === void 0 ? "*" : isDate ? formatDate(v) : formatKey(v);
		const key = range.key === void 0 ? `${label(from)}-${label(to)}` : String(range.key);
		const matched = units.filter((unit) => numbersOf(agg, unit, field, options.missing).some((v) => (from === void 0 || v >= from) && (to === void 0 || v < to)));
		return {
			key,
			...from !== void 0 ? {
				from,
				...isDate ? { from_as_string: formatDate(from) } : {}
			} : {},
			...to !== void 0 ? {
				to,
				...isDate ? { to_as_string: formatDate(to) } : {}
			} : {},
			doc_count: matched.length,
			...subResults(agg, subAggs, matched)
		};
	});
	if (keyed) {
		const result = {};
		for (const { key, ...rest } of buckets) result[key] = rest;
		return { buckets: result };
	}
	return { buckets };
};
const formatKey = (value) => Number.isInteger(value) ? `${value}.0` : String(value);
const histogramBuckets = (agg, options, units, subAggs, isDate) => {
	const type = isDate ? "date_histogram" : "histogram";
	rejectOptions(options, [
		"field",
		"interval",
		"fixed_interval",
		"calendar_interval",
		"min_doc_count",
		"missing",
		"format",
		"extended_bounds",
		"hard_bounds",
		"offset",
		"order",
		"keyed",
		"time_zone",
		"script"
	], type);
	if (options.time_zone !== void 0) throw unsupported(`the "time_zone" option of the "${type}" aggregation`);
	if (options.order !== void 0) throw unsupported(`the "order" option of the "${type}" aggregation`);
	if (options.keyed !== void 0) throw unsupported(`the "keyed" option of the "${type}" aggregation`);
	if (options.offset !== void 0) throw unsupported(`the "offset" option of the "${type}" aggregation`);
	if (options.hard_bounds !== void 0) throw unsupported(`the "hard_bounds" option of the "${type}" aggregation`);
	const field = requireField(options, type);
	const minDocCount = Number(options.min_doc_count ?? 0);
	let interval;
	if (isDate) {
		if (options.fixed_interval !== void 0) interval = { fixed: parseFixedInterval(String(options.fixed_interval)) };
		else if (options.calendar_interval !== void 0) interval = { calendar: parseCalendarInterval(String(options.calendar_interval)) };
		else if (options.interval !== void 0) throw unsupported("the deprecated \"interval\" option of date_histogram (use fixed_interval or calendar_interval)");
		else throw illegalArgument("Required one of fields [interval, fixed_interval, calendar_interval], but none were specified.");
	} else {
		const step = Number(options.interval);
		if (!(step > 0)) throw illegalArgument("[interval] must be 1 or greater for aggregation [histogram]");
		interval = { fixed: step };
	}
	const groups = /* @__PURE__ */ new Map();
	for (const unit of units) {
		const seen = /* @__PURE__ */ new Set();
		for (const value of numbersOf(agg, unit, field, options.missing)) {
			const key = roundToInterval(value, interval);
			if (seen.has(key)) continue;
			seen.add(key);
			let bucket = groups.get(key);
			if (!bucket) {
				bucket = {
					key,
					doc_count: 0,
					units: []
				};
				groups.set(key, bucket);
			}
			bucket.doc_count++;
			bucket.units.push(unit);
		}
	}
	const keys = [...groups.keys()].toSorted((a, b) => a - b);
	let buckets;
	if (minDocCount === 0 && keys.length > 0) {
		let min = keys[0];
		let max = keys[keys.length - 1];
		if (isPlainObject(options.extended_bounds)) {
			const bounds = options.extended_bounds;
			if (bounds.min !== void 0) min = Math.min(min, roundToInterval(Number(bounds.min), interval));
			if (bounds.max !== void 0) max = Math.max(max, roundToInterval(Number(bounds.max), interval));
		}
		buckets = [];
		for (let key = min; key <= max; key = nextInterval(key, interval)) buckets.push(groups.get(key) ?? {
			key,
			doc_count: 0,
			units: []
		});
	} else buckets = keys.map((key) => groups.get(key)).filter((b) => b.doc_count >= minDocCount);
	return { buckets: buckets.map((bucket) => ({
		...isDate ? { key_as_string: formatDate(bucket.key) } : {},
		key: bucket.key,
		doc_count: bucket.doc_count,
		...subResults(agg, subAggs, bucket.units)
	})) };
};
const renderTopHit = (agg, hit, specs, source) => {
	const ctx = agg.contextFor(hit.doc.index);
	const filtered = applySourceFilter(hit.doc.source, source);
	return {
		_index: hit.doc.index,
		_id: hit.doc.id,
		_score: specs.length === 0 || specs.some((s) => s.field === "_score") ? hit.score : null,
		...filtered !== void 0 ? { _source: filtered } : {},
		...specs.length > 0 ? { sort: hit.sort.map((v, i) => renderSortValue(ctx, v, specs[i])) } : {}
	};
};
const runTopHits = (agg, options, units) => {
	rejectOptions(options, [
		"size",
		"from",
		"sort",
		"_source",
		"version",
		"seq_no_primary_term",
		"explain",
		"track_scores"
	], "top_hits");
	const size = Number(options.size ?? 3);
	const from = Number(options.from ?? 0);
	const specs = parseSort(options.sort);
	const source = parseSourceFilter(options._source);
	const hits = units.map((unit) => {
		const doc = unit.root;
		const score = agg.scores.get(unit) ?? agg.scores.get(doc) ?? 1;
		const ctx = agg.contextFor(doc.index);
		return {
			doc,
			score,
			sort: specs.map((spec) => sortValueOf(ctx, doc, score, spec))
		};
	});
	hits.sort((a, b) => specs.length > 0 ? compareHits(a, b, specs) : defaultCompare(a, b));
	const page = hits.slice(from, from + size);
	const maxScore = specs.length === 0 && page.length > 0 ? Math.max(...page.map((h) => h.score)) : null;
	return { hits: {
		total: {
			value: hits.length,
			relation: "eq"
		},
		max_score: maxScore,
		hits: page.map((hit) => renderTopHit(agg, hit, specs, source))
	} };
};
const runBucket = (agg, type, options, units, subAggs) => {
	switch (type) {
		case "terms": return runTerms(agg, options, units, subAggs);
		case "filter": {
			const matches = compileFilter(agg, options);
			const matched = units.filter(matches);
			return {
				doc_count: matched.length,
				...subResults(agg, subAggs, matched)
			};
		}
		case "filters": {
			rejectOptions(options, [
				"filters",
				"other_bucket",
				"other_bucket_key"
			], type);
			const filters = options.filters;
			const otherKey = options.other_bucket_key === void 0 ? "_other_" : String(options.other_bucket_key);
			const wantOther = options.other_bucket === true || options.other_bucket_key !== void 0;
			if (Array.isArray(filters)) {
				const buckets = filters.map((f) => {
					const matched = units.filter(compileFilter(agg, f));
					return {
						doc_count: matched.length,
						...subResults(agg, subAggs, matched)
					};
				});
				if (wantOther) {
					const matchers = filters.map((f) => compileFilter(agg, f));
					const other = units.filter((u) => !matchers.some((m) => m(u)));
					buckets.push({
						doc_count: other.length,
						...subResults(agg, subAggs, other)
					});
				}
				return { buckets };
			}
			const named = asObject(filters, "filters");
			const buckets = {};
			const matchers = Object.entries(named).map(([key, f]) => [key, compileFilter(agg, f)]);
			for (const [key, matches] of matchers) {
				const matched = units.filter(matches);
				buckets[key] = {
					doc_count: matched.length,
					...subResults(agg, subAggs, matched)
				};
			}
			if (wantOther) {
				const other = units.filter((u) => !matchers.some(([, m]) => m(u)));
				buckets[otherKey] = {
					doc_count: other.length,
					...subResults(agg, subAggs, other)
				};
			}
			return { buckets };
		}
		case "range":
			rejectOptions(options, [
				"field",
				"ranges",
				"keyed",
				"missing",
				"script"
			], type);
			return rangeBuckets(agg, options, units, subAggs, false);
		case "date_range":
			rejectOptions(options, [
				"field",
				"ranges",
				"keyed",
				"missing",
				"format",
				"time_zone",
				"script"
			], type);
			if (options.time_zone !== void 0) throw unsupported("the \"time_zone\" option of the \"date_range\" aggregation");
			return rangeBuckets(agg, options, units, subAggs, true);
		case "histogram": return histogramBuckets(agg, options, units, subAggs, false);
		case "date_histogram": return histogramBuckets(agg, options, units, subAggs, true);
		case "nested": {
			rejectOptions(options, ["path"], type);
			if (typeof options.path !== "string") throw parsingError("[nested] aggregation requires a path");
			const path = options.path;
			const nestedUnits = [];
			for (const unit of units) {
				const ctx = agg.contextFor(unit.root.index);
				const field = resolveField(ctx.index.mapping, path);
				if (field && field.type !== "nested") throw illegalArgument(`[nested] nested object under path [${path}] is not of nested type`);
				nestedUnits.push(...unit.nested.get(path) ?? []);
			}
			return {
				doc_count: nestedUnits.length,
				...subResults(agg, subAggs, nestedUnits)
			};
		}
		case "reverse_nested": {
			rejectOptions(options, ["path"], type);
			if (options.path !== void 0) throw unsupported("the \"path\" option of the \"reverse_nested\" aggregation");
			const roots = [];
			const seen = /* @__PURE__ */ new Set();
			for (const unit of units) {
				if (seen.has(unit.root)) continue;
				seen.add(unit.root);
				roots.push(unit.root);
			}
			return {
				doc_count: roots.length,
				...subResults(agg, subAggs, roots)
			};
		}
		case "global": {
			rejectOptions(options, [], type);
			const all = agg.allDocs();
			return {
				doc_count: all.length,
				...subResults(agg, subAggs, all)
			};
		}
		case "top_hits":
			if (subAggs !== void 0) throw illegalArgument("Aggregator [top_hits] cannot accept sub-aggregations");
			return runTopHits(agg, options, units);
		default: throw unsupported(`the "${type}" aggregation`);
	}
};
//#endregion
//#region src/engine/search.ts
const SEARCH_BODY_KEYS = /* @__PURE__ */ new Set([
	"query",
	"from",
	"size",
	"sort",
	"search_after",
	"track_total_hits",
	"track_scores",
	"_source",
	"aggs",
	"aggregations",
	"min_score",
	"explain",
	"timeout",
	"version",
	"seq_no_primary_term",
	"stored_fields",
	"profile",
	"terminate_after"
]);
const SEARCH_PARAMS = /* @__PURE__ */ new Set([
	"size",
	"from",
	"q",
	"track_total_hits",
	"default_operator",
	"df",
	"analyzer",
	"analyze_wildcard",
	"lenient",
	"timeout",
	"pretty",
	"human",
	"error_trace",
	"filter_path",
	"routing",
	"preference",
	"ignore_unavailable",
	"allow_no_indices",
	"expand_wildcards",
	"rest_total_hits_as_int",
	"typed_keys",
	"search_type",
	"request_cache",
	"allow_partial_search_results",
	"batched_reduce_size",
	"max_concurrent_shard_requests",
	"ccs_minimize_roundtrips",
	"seq_no_primary_term",
	"version",
	"_source",
	"sort",
	"explain",
	"track_scores",
	"terminate_after",
	"scroll",
	"stored_fields",
	"min_score"
]);
const readBoolean = (value, what) => {
	if (value === void 0) return void 0;
	if (value === true || value === "true") return true;
	if (value === false || value === "false") return false;
	throw illegalArgument(`Failed to parse value [${String(value)}] as only [true] or [false] are allowed for [${what}]`);
};
const readInteger = (value, what) => {
	if (value === void 0 || value === null) return void 0;
	const number = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(number)) throw illegalArgument(`[${what}] must be an integer`);
	return number;
};
const queryFromParams = (params) => {
	const q = params.get("q");
	if (q === null) return void 0;
	const options = { query: q };
	if (params.has("df")) options.default_field = params.get("df");
	if (params.has("default_operator")) options.default_operator = params.get("default_operator");
	if (params.has("analyzer")) options.analyzer = params.get("analyzer");
	if (params.has("analyze_wildcard")) options.analyze_wildcard = params.get("analyze_wildcard") === "true";
	if (params.has("lenient")) options.lenient = params.get("lenient") === "true";
	return { query_string: options };
};
const validateParams = (params) => {
	for (const key of params.keys()) if (!SEARCH_PARAMS.has(key)) throw unsupported(`the "${key}" search parameter`);
	if (params.has("scroll")) throw unsupported("scroll searches");
	if (params.has("rest_total_hits_as_int") && params.get("rest_total_hits_as_int") === "true") throw unsupported("the \"rest_total_hits_as_int\" search parameter");
};
const resolveQuery = (body, params) => {
	const fromParams = queryFromParams(params);
	if (fromParams && body.query !== void 0) throw illegalArgument("Cannot combine the q parameter with a request body query");
	return fromParams ?? body.query;
};
const collectMatches = (index, query, now) => {
	const ctx = createContext(index, now);
	let compiled;
	try {
		compiled = compileQuery(ctx, query);
	} catch (error) {
		throw wrapSearchError(error, index.name);
	}
	const hits = [];
	for (const doc of index.docs.values()) {
		const score = compiled.match(doc);
		if (score !== void 0) hits.push({
			doc,
			score,
			sort: []
		});
	}
	return {
		index,
		ctx,
		hits
	};
};
const countDocuments = (store, indices, body, params) => {
	const query = resolveQuery(body ?? {}, params);
	let count = 0;
	const now = Date.now();
	for (const index of store.resolve(indices)) count += collectMatches(index, query, now).hits.length;
	return count;
};
const deleteByQuery = (store, indices, body, params) => {
	const query = resolveQuery(body ?? {}, params);
	if (query === void 0) throw illegalArgument("query is missing");
	let deleted = 0;
	const now = Date.now();
	for (const index of store.resolve(indices)) for (const hit of collectMatches(index, query, now).hits) {
		index.delete(hit.doc.id);
		deleted++;
	}
	return deleted;
};
const search = (store, request) => {
	const started = Date.now();
	const { body, params } = request;
	validateParams(params);
	for (const key of Object.keys(body)) if (!SEARCH_BODY_KEYS.has(key)) throw unsupported(`the "${key}" search body option`);
	if (body.explain === true) throw unsupported("explain: true");
	if (body.profile === true) throw unsupported("profile: true");
	if (body.terminate_after !== void 0) throw unsupported("terminate_after");
	if (body.stored_fields !== void 0 && body.stored_fields !== "_none_" && body.stored_fields !== "_source") throw unsupported("stored_fields other than \"_none_\"");
	const from = readInteger(body.from ?? params.get("from") ?? void 0, "from") ?? 0;
	const size = readInteger(body.size ?? params.get("size") ?? void 0, "size") ?? 10;
	if (from < 0) throw illegalArgument("[from] parameter cannot be negative");
	if (size < 0) throw illegalArgument("[size] parameter cannot be negative");
	const trackTotalHits = body.track_total_hits ?? params.get("track_total_hits") ?? void 0;
	const trackScores = readBoolean(body.track_scores ?? params.get("track_scores") ?? void 0, "track_scores") ?? false;
	const includeVersion = readBoolean(body.version ?? params.get("version") ?? void 0, "version") ?? false;
	const includeSeqNo = readBoolean(body.seq_no_primary_term ?? params.get("seq_no_primary_term") ?? void 0, "seq_no_primary_term") ?? false;
	const minScore = body.min_score === void 0 ? void 0 : Number(body.min_score);
	const sourceFilter = body.stored_fields === "_none_" ? false : parseSourceFilter(body._source ?? params.get("_source") ?? void 0);
	const query = resolveQuery(body, params);
	const specs = parseSort(body.sort ?? (params.has("sort") ? params.get("sort").split(",") : void 0));
	const searchAfter = body.search_after === void 0 ? void 0 : normalizeSearchAfter(body.search_after, specs);
	const indices = store.resolve(request.indices);
	const now = started;
	const matches = [];
	for (const index of indices) {
		const matched = collectMatches(index, query, now);
		if (minScore !== void 0) matched.hits = matched.hits.filter((hit) => hit.score >= minScore);
		try {
			for (const hit of matched.hits) hit.sort = specs.map((spec) => sortValueOf(matched.ctx, hit.doc, hit.score, spec));
		} catch (error) {
			throw wrapSearchError(error, index.name);
		}
		matches.push(matched);
	}
	const contexts = new Map(matches.map((m) => [m.index.name, m.ctx]));
	let hits = matches.flatMap((m) => m.hits);
	hits.sort((a, b) => specs.length > 0 ? compareHits(a, b, specs) : defaultCompare(a, b));
	const aggregations = runAggs(body.aggs ?? body.aggregations, hits, contexts, indices);
	if (searchAfter) hits = hits.filter((hit) => isAfter(hit, searchAfter, specs));
	const total = hits.length;
	const page = hits.slice(from, from + size);
	const scored = specs.length === 0 || specs.some((s) => s.field === "_score") || trackScores;
	const maxScore = scored && page.length > 0 ? Math.max(...page.map((h) => h.score)) : null;
	const response = {
		took: Date.now() - started,
		timed_out: false,
		_shards: {
			total: 1,
			successful: 1,
			skipped: 0,
			failed: 0
		},
		hits: {
			...renderTotal(total, trackTotalHits),
			max_score: maxScore,
			hits: page.map((hit) => renderHit(hit, contexts.get(hit.doc.index), specs, scored, sourceFilter, includeVersion, includeSeqNo))
		}
	};
	if (aggregations) response.aggregations = aggregations;
	return response;
};
const renderTotal = (total, track) => {
	if (track === false || track === "false") return {};
	if (track === void 0 || track === true || track === "true") return { total: {
		value: total,
		relation: "eq"
	} };
	const limit = Number(track);
	if (!Number.isInteger(limit)) throw illegalArgument(`[track_total_hits] must be a boolean or an integer, got [${String(track)}]`);
	return total <= limit ? { total: {
		value: total,
		relation: "eq"
	} } : { total: {
		value: limit,
		relation: "gte"
	} };
};
const renderHit = (hit, ctx, specs, scored, sourceFilter, includeVersion, includeSeqNo) => {
	const source = applySourceFilter(hit.doc.source, sourceFilter);
	const rendered = {
		_index: hit.doc.index,
		_id: hit.doc.id,
		_score: scored ? hit.score : null
	};
	if (includeVersion) rendered._version = hit.doc.version;
	if (includeSeqNo) {
		rendered._seq_no = hit.doc.seqNo;
		rendered._primary_term = 1;
	}
	if (source !== void 0) rendered._source = source;
	if (specs.length > 0) rendered.sort = hit.sort.map((value, i) => renderSortValue(ctx, value, specs[i]));
	return rendered;
};
const runAggs = (spec, hits, contexts, indices) => {
	if (spec === void 0) return void 0;
	if (!isPlainObject(spec)) throw illegalArgument("aggregations must be an object");
	if (Object.keys(spec).length === 0) return void 0;
	const scores = /* @__PURE__ */ new Map();
	for (const hit of hits) scores.set(hit.doc, hit.score);
	const agg = {
		contextFor: (name) => contexts.get(name),
		scores,
		allDocs: () => indices.flatMap((index) => [...index.docs.values()])
	};
	try {
		return runAggregations(agg, spec, hits.map((h) => h.doc));
	} catch (error) {
		throw wrapSearchError(error, indices[0]?.name ?? "_all");
	}
};
//#endregion
//#region src/routes.ts
const CLUSTER_NAME = "awsless-local";
const CLUSTER_UUID = "YwXa7Uh2QlOu0J2KcKmkTw";
const SHARDS = {
	total: 2,
	successful: 1,
	failed: 0
};
const ok = (body, status = 200) => ({
	status,
	body
});
const requireBody = (request) => {
	if (!isPlainObject(request.body)) throw illegalArgument("request body is required");
	return request.body;
};
const optionalBody = (request) => {
	if (request.body === void 0) return void 0;
	if (!isPlainObject(request.body)) throw illegalArgument("request body must be a JSON object");
	return request.body;
};
const writeResponse = (index, result) => ({
	_index: index.name,
	_id: result.doc.id,
	_version: result.doc.version,
	result: result.result,
	_shards: SHARDS,
	_seq_no: result.doc.seqNo,
	_primary_term: 1
});
const getResponse = (index, id, sourceFilter) => {
	const doc = index.get(id);
	if (!doc) return {
		_index: index.name,
		_id: id,
		found: false
	};
	const source = applySourceFilter(doc.source, sourceFilter);
	return {
		_index: index.name,
		_id: id,
		_version: doc.version,
		_seq_no: doc.seqNo,
		_primary_term: 1,
		found: true,
		...source !== void 0 ? { _source: source } : {}
	};
};
const sourceFilterFromParams = (params) => {
	const value = params.get("_source");
	const includes = params.get("_source_includes") ?? params.get("_source_include");
	const excludes = params.get("_source_excludes") ?? params.get("_source_exclude");
	if (includes || excludes) return parseSourceFilter({
		includes: includes?.split(",") ?? [],
		excludes: excludes?.split(",") ?? []
	});
	if (value === null) return void 0;
	if (value === "true") return void 0;
	if (value === "false") return false;
	return parseSourceFilter(value.split(","));
};
const parseBulkBody = (raw, defaultIndex) => {
	const lines = raw.split("\n").filter((line) => line.trim() !== "");
	const items = [];
	for (let i = 0; i < lines.length; i++) {
		let actionLine;
		try {
			actionLine = JSON.parse(lines[i]);
		} catch {
			throw illegalArgument(`Malformed action/metadata line [${i + 1}], expected a JSON object`);
		}
		if (!isPlainObject(actionLine) || Object.keys(actionLine).length !== 1) throw illegalArgument(`Malformed action/metadata line [${i + 1}], expected a single action`);
		const action = Object.keys(actionLine)[0];
		if (![
			"index",
			"create",
			"update",
			"delete"
		].includes(action)) throw illegalArgument(`Malformed action/metadata line [${i + 1}], expected one of [create, delete, index, update] but found [${action}]`);
		const meta = isPlainObject(actionLine[action]) ? actionLine[action] : {};
		if (meta._index === void 0 && defaultIndex === void 0) throw illegalArgument("Validation Failed: 1: index is missing;");
		meta._index ??= defaultIndex;
		if (action === "delete") {
			items.push({
				action,
				meta
			});
			continue;
		}
		const sourceLine = lines[++i];
		if (sourceLine === void 0) throw illegalArgument(`Validation Failed: 1: no requests added;`);
		let source;
		try {
			source = JSON.parse(sourceLine);
		} catch {
			throw illegalArgument(`Malformed source line [${i + 1}], expected a JSON object`);
		}
		if (!isPlainObject(source)) throw illegalArgument(`Malformed source line [${i + 1}], expected a JSON object`);
		items.push({
			action,
			meta,
			source
		});
	}
	return items;
};
const bulkError = (error, index, id) => {
	if (!(error instanceof OpenSearchError)) throw error;
	return {
		_index: index,
		_id: id ?? null,
		status: error.status,
		error: {
			type: error.type,
			reason: error.reason,
			index,
			index_uuid: "_na_",
			shard: "0"
		}
	};
};
const runBulk = (store, request, defaultIndex) => {
	const started = Date.now();
	const items = parseBulkBody(request.rawBody, defaultIndex);
	let errors = false;
	const results = items.map((item) => {
		const indexName = String(item.meta._index);
		const id = item.meta._id === void 0 ? void 0 : String(item.meta._id);
		try {
			if (item.action === "delete") {
				const index = store.indices.get(indexName);
				if (!index) throw indexNotFound(indexName);
				if (id === void 0) throw illegalArgument("Validation Failed: 1: id is missing;");
				const doc = index.delete(id);
				return { delete: {
					_index: indexName,
					_id: id,
					_version: doc ? doc.version + 1 : 1,
					result: doc ? "deleted" : "not_found",
					_shards: SHARDS,
					_seq_no: doc?.seqNo ?? 0,
					_primary_term: 1,
					status: doc ? 200 : 404
				} };
			}
			const index = store.getOrCreate(indexName);
			if (item.action === "update") {
				if (id === void 0) throw illegalArgument("Validation Failed: 1: id is missing;");
				const result = index.update(id, item.source);
				return { update: {
					...writeResponse(index, result),
					status: 200
				} };
			}
			const create = item.action === "create" || item.meta.op_type === "create";
			const result = index.put(id ?? generateId(), item.source, { create });
			return { [item.action]: {
				...writeResponse(index, result),
				status: result.result === "created" ? 201 : 200
			} };
		} catch (error) {
			errors = true;
			return { [item.action]: bulkError(error, indexName, id) };
		}
	});
	return ok({
		took: Date.now() - started,
		errors,
		items: results
	});
};
const catIndices = (store, params, expression) => {
	const format = params.get("format") ?? "text";
	if (format !== "json") throw unsupported(`the "${format}" cat format (use format=json)`);
	const indices = expression === void 0 ? [...store.indices.values()] : store.resolve(expression);
	return ok(indices.map((index) => ({
		health: "green",
		status: "open",
		index: index.name,
		uuid: index.uuid,
		pri: "1",
		rep: "1",
		"docs.count": String(index.docs.size),
		"docs.deleted": "0",
		"store.size": "0b",
		"pri.store.size": "0b"
	})));
};
const clusterHealth = (store) => ({
	cluster_name: CLUSTER_NAME,
	status: "green",
	timed_out: false,
	number_of_nodes: 1,
	number_of_data_nodes: 1,
	discovered_master: true,
	discovered_cluster_manager: true,
	active_primary_shards: store.indices.size,
	active_shards: store.indices.size,
	relocating_shards: 0,
	initializing_shards: 0,
	unassigned_shards: 0,
	delayed_unassigned_shards: 0,
	number_of_pending_tasks: 0,
	number_of_in_flight_fetch: 0,
	task_max_waiting_in_queue_millis: 0,
	active_shards_percent_as_number: 100
});
const mgetDocs = (store, request, defaultIndex) => {
	const body = requireBody(request);
	const filter = sourceFilterFromParams(request.params);
	const entries = [];
	if (Array.isArray(body.ids)) {
		if (defaultIndex === void 0) throw illegalArgument("Validation Failed: 1: index is missing;");
		for (const id of body.ids) entries.push({
			index: defaultIndex,
			id: String(id),
			filter
		});
	} else if (Array.isArray(body.docs)) for (const doc of body.docs) {
		if (!isPlainObject(doc)) throw illegalArgument("docs entries must be objects");
		const index = doc._index === void 0 ? defaultIndex : String(doc._index);
		if (index === void 0) throw illegalArgument("Validation Failed: 1: index is missing;");
		if (doc._id === void 0) throw illegalArgument("Validation Failed: 1: id is missing;");
		entries.push({
			index,
			id: String(doc._id),
			filter: doc._source === void 0 ? filter : parseSourceFilter(doc._source)
		});
	}
	else throw illegalArgument("Validation Failed: 1: no documents to get;");
	return ok({ docs: entries.map((entry) => {
		const index = store.indices.get(entry.index);
		if (!index) {
			const error = indexNotFound(entry.index);
			return {
				_index: entry.index,
				_id: entry.id,
				error: {
					type: error.type,
					reason: error.reason,
					index: entry.index
				}
			};
		}
		return getResponse(index, entry.id, entry.filter);
	}) });
};
const putDocument = (store, request, indexName, id, forceCreate) => {
	const source = requireBody(request);
	const index = store.getOrCreate(indexName);
	const create = forceCreate || request.params.get("op_type") === "create";
	if (create && id !== void 0 && index.get(id)) throw versionConflict(indexName, id);
	const result = index.put(id ?? generateId(), source, { create });
	return ok(writeResponse(index, result), result.result === "created" ? 201 : 200);
};
const createRoutes = (store) => {
	const route = (methods, pattern, handler) => ({
		methods: methods.split(","),
		pattern: pattern.split("/").filter(Boolean),
		handler
	});
	const searchHandler = (request, path) => {
		return ok(search(store, {
			indices: path.index,
			body: optionalBody(request) ?? {},
			params: request.params
		}));
	};
	const countHandler = (request, path) => {
		return ok({
			count: countDocuments(store, path.index, optionalBody(request), request.params),
			_shards: {
				total: 1,
				successful: 1,
				skipped: 0,
				failed: 0
			}
		});
	};
	return [
		route("GET", "/", () => ok({
			name: "awsless-local-node",
			cluster_name: CLUSTER_NAME,
			cluster_uuid: CLUSTER_UUID,
			version: {
				distribution: "opensearch",
				number: "3.5.0",
				build_type: "tar",
				build_hash: "local",
				build_date: "2026-01-01T00:00:00.000Z",
				build_snapshot: false,
				lucene_version: "10.3.1",
				minimum_wire_compatibility_version: "2.19.0",
				minimum_index_compatibility_version: "2.0.0"
			},
			tagline: "The OpenSearch Project: https://opensearch.org/"
		})),
		route("HEAD", "/", () => ok(void 0)),
		route("GET", "/_cluster/health", () => ok(clusterHealth(store))),
		route("GET", "/_cluster/health/:index", (_request, path) => {
			store.resolve(path.index);
			return ok(clusterHealth(store));
		}),
		route("GET", "/_cat/health", (request) => {
			if ((request.params.get("format") ?? "text") !== "json") throw unsupported("the text cat format (use format=json)");
			const now = Date.now();
			return ok([{
				epoch: String(Math.floor(now / 1e3)),
				timestamp: new Date(now).toISOString().slice(11, 19),
				cluster: CLUSTER_NAME,
				status: "green",
				"node.total": "1",
				"node.data": "1",
				discovered_cluster_manager: "true",
				shards: String(store.indices.size),
				pri: String(store.indices.size),
				relo: "0",
				init: "0",
				unassign: "0",
				pending_tasks: "0",
				max_task_wait_time: "-",
				active_shards_percent: "100.0%"
			}]);
		}),
		route("GET", "/_cat/indices", (request) => catIndices(store, request.params, void 0)),
		route("GET", "/_cat/indices/:index", (request, path) => catIndices(store, request.params, path.index)),
		route("POST,PUT", "/_bulk", (request) => runBulk(store, request, void 0)),
		route("POST,PUT", "/:index/_bulk", (request, path) => runBulk(store, request, path.index)),
		route("GET,POST", "/_mget", (request) => mgetDocs(store, request, void 0)),
		route("GET,POST", "/:index/_mget", (request, path) => mgetDocs(store, request, path.index)),
		route("GET,POST", "/_search", searchHandler),
		route("GET,POST", "/:index/_search", searchHandler),
		route("GET,POST", "/_count", countHandler),
		route("GET,POST", "/:index/_count", countHandler),
		route("GET,POST", "/_refresh", () => ok({ _shards: SHARDS })),
		route("GET,POST", "/:index/_refresh", (_request, path) => {
			store.resolve(path.index);
			return ok({ _shards: SHARDS });
		}),
		route("GET", "/_mapping", () => {
			const result = {};
			for (const index of store.indices.values()) result[index.name] = { mappings: index.mapping };
			return ok(result);
		}),
		route("GET", "/_all", () => {
			const result = {};
			for (const index of store.indices.values()) result[index.name] = index.describe();
			return ok(result);
		}),
		route("HEAD", "/:index", (_request, path) => {
			const found = store.resolve(path.index);
			return ok(void 0, found.length > 0 || path.index.includes("*") ? 200 : 404);
		}),
		route("GET", "/:index", (_request, path) => {
			const result = {};
			for (const index of store.resolve(path.index)) result[index.name] = index.describe();
			return ok(result);
		}),
		route("PUT", "/:index", (request, path) => {
			const body = optionalBody(request) ?? {};
			for (const key of Object.keys(body)) if (![
				"settings",
				"mappings",
				"aliases"
			].includes(key)) throw unsupported(`the "${key}" index creation option`);
			if (isPlainObject(body.aliases) && Object.keys(body.aliases).length > 0) throw unsupported("index aliases");
			store.create(path.index, body.settings, body.mappings);
			return ok({
				acknowledged: true,
				shards_acknowledged: true,
				index: path.index
			});
		}),
		route("DELETE", "/:index", (_request, path) => {
			store.delete(path.index);
			return ok({ acknowledged: true });
		}),
		route("GET", "/:index/_mapping", (_request, path) => {
			const result = {};
			for (const index of store.resolve(path.index)) result[index.name] = { mappings: index.mapping };
			return ok(result);
		}),
		route("PUT,POST", "/:index/_mapping", (request, path) => {
			const body = requireBody(request);
			for (const index of store.resolve(path.index)) index.putMapping(body);
			return ok({ acknowledged: true });
		}),
		route("GET", "/:index/_settings", (_request, path) => {
			const result = {};
			for (const index of store.resolve(path.index)) result[index.name] = { settings: index.describe().settings };
			return ok(result);
		}),
		route("POST", "/:index/_doc", (request, path) => putDocument(store, request, path.index, void 0, false)),
		route("PUT,POST", "/:index/_doc/:id", (request, path) => putDocument(store, request, path.index, path.id, false)),
		route("PUT,POST", "/:index/_create/:id", (request, path) => putDocument(store, request, path.index, path.id, true)),
		route("GET", "/:index/_doc/:id", (request, path) => {
			const index = store.get(path.index);
			const response = getResponse(index, path.id, sourceFilterFromParams(request.params));
			return ok(response, response.found ? 200 : 404);
		}),
		route("HEAD", "/:index/_doc/:id", (_request, path) => {
			const index = store.get(path.index);
			return ok(void 0, index.get(path.id) ? 200 : 404);
		}),
		route("GET", "/:index/_source/:id", (request, path) => {
			const doc = store.get(path.index).get(path.id);
			if (!doc) throw new OpenSearchError("resource_not_found_exception", 404, `Document not found [${path.index}]/[${path.id}]`);
			return ok(applySourceFilter(doc.source, sourceFilterFromParams(request.params)) ?? {});
		}),
		route("HEAD", "/:index/_source/:id", (_request, path) => {
			const index = store.get(path.index);
			return ok(void 0, index.get(path.id) ? 200 : 404);
		}),
		route("DELETE", "/:index/_doc/:id", (_request, path) => {
			const index = store.get(path.index);
			const doc = index.delete(path.id);
			return ok({
				_index: index.name,
				_id: path.id,
				_version: doc ? doc.version + 1 : 1,
				result: doc ? "deleted" : "not_found",
				_shards: SHARDS,
				_seq_no: doc?.seqNo ?? 0,
				_primary_term: 1
			}, doc ? 200 : 404);
		}),
		route("POST", "/:index/_update/:id", (request, path) => {
			const index = store.get(path.index);
			const body = requireBody(request);
			const result = index.update(path.id, body);
			const response = writeResponse(index, result);
			const sourceParam = request.params.get("_source") ?? (body._source === true ? "true" : void 0);
			if (sourceParam !== void 0 && sourceParam !== "false") response.get = {
				_seq_no: result.doc.seqNo,
				_primary_term: 1,
				found: true,
				_source: result.doc.source
			};
			return ok(response);
		}),
		route("POST", "/:index/_delete_by_query", (request, path) => {
			const started = Date.now();
			const deleted = deleteByQuery(store, path.index, optionalBody(request), request.params);
			return ok({
				took: Date.now() - started,
				timed_out: false,
				total: deleted,
				deleted,
				batches: deleted > 0 ? 1 : 0,
				version_conflicts: 0,
				noops: 0,
				retries: {
					bulk: 0,
					search: 0
				},
				throttled_millis: 0,
				requests_per_second: -1,
				throttled_until_millis: 0,
				failures: []
			});
		})
	];
};
const matchRoute = (route, request) => {
	if (!route.methods.includes(request.method)) return void 0;
	if (route.pattern.length !== request.segments.length) return void 0;
	const params = {};
	for (let i = 0; i < route.pattern.length; i++) {
		const expected = route.pattern[i];
		const actual = request.segments[i];
		if (expected.startsWith(":")) {
			if (actual.startsWith("_") && expected !== ":id") return void 0;
			params[expected.slice(1)] = actual;
		} else if (expected !== actual) return;
	}
	return params;
};
const dispatch = (routes, request) => {
	let methodMismatch = false;
	for (const route of routes) {
		const params = matchRoute(route, request);
		if (params) return route.handler(request, params);
		if (route.pattern.length === request.segments.length && !route.methods.includes(request.method)) {
			const probe = {
				...request,
				method: route.methods[0]
			};
			if (matchRoute(route, probe)) methodMismatch = true;
		}
	}
	const path = `/${request.segments.join("/")}`;
	if (methodMismatch) return {
		status: 405,
		body: {
			error: `Incorrect HTTP method for uri [${path}] and method [${request.method}]`,
			status: 405
		}
	};
	throw unsupported(`the ${request.method} ${path} endpoint`);
};
//#endregion
//#region src/server.ts
const readBody = (req) => {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
};
var MemoryOpenSearchServer = class {
	host;
	initialPort;
	store = new Store();
	routes = createRoutes(this.store);
	sockets = /* @__PURE__ */ new Set();
	server;
	boundPort = 0;
	constructor(options = {}) {
		this.host = options.host ?? "127.0.0.1";
		this.initialPort = options.port ?? 0;
	}
	get port() {
		return this.boundPort;
	}
	get endpoint() {
		return `http://${this.host}:${this.boundPort}`;
	}
	async listen(port = this.initialPort) {
		if (this.server) throw new Error("The OpenSearch server is already listening");
		const server = (0, node_http.createServer)((req, res) => {
			this.handle(req, res).catch((error) => {
				const message = error instanceof Error ? error.message : String(error);
				this.send(res, 500, {
					error: {
						root_cause: [{
							type: "exception",
							reason: message
						}],
						type: "exception",
						reason: message
					},
					status: 500
				});
			});
		});
		server.on("connection", (socket) => {
			this.sockets.add(socket);
			socket.on("close", () => this.sockets.delete(socket));
		});
		this.server = server;
		await new Promise((resolve, reject) => {
			server.once("error", reject);
			server.listen(port, this.host, () => {
				server.off("error", reject);
				const address = server.address();
				this.boundPort = typeof address === "object" && address ? address.port : port;
				resolve();
			});
		});
	}
	async close() {
		const server = this.server;
		if (!server) return;
		this.server = void 0;
		for (const socket of this.sockets) socket.destroy();
		this.sockets.clear();
		await new Promise((resolve) => server.close(() => resolve()));
		this.boundPort = 0;
	}
	reset() {
		this.store.reset();
	}
	send(res, status, body, head = false) {
		const payload = body === void 0 ? "" : JSON.stringify(body);
		res.writeHead(status, {
			"content-type": "application/json; charset=UTF-8",
			"content-length": Buffer.byteLength(payload)
		});
		res.end(head ? void 0 : payload);
	}
	async handle(req, res) {
		const url = new URL(req.url ?? "/", "http://localhost");
		const method = (req.method ?? "GET").toUpperCase();
		const rawBody = await readBody(req);
		const isHead = method === "HEAD";
		try {
			const request = {
				method,
				segments: url.pathname.split("/").filter(Boolean).map(decodeURIComponent),
				params: url.searchParams,
				rawBody,
				body: parseBody(rawBody, url.pathname)
			};
			const response = dispatch(this.routes, request);
			this.send(res, response.status, isHead ? void 0 : response.body, isHead);
		} catch (error) {
			if (error instanceof OpenSearchError) {
				this.send(res, error.status, error.toBody(), isHead);
				return;
			}
			throw error;
		}
	}
};
const parseBody = (rawBody, pathname) => {
	if (rawBody.trim() === "" || pathname.endsWith("/_bulk")) return void 0;
	try {
		return JSON.parse(rawBody);
	} catch {
		throw new OpenSearchError("parsing_exception", 400, "request body is not valid JSON");
	}
};
//#endregion
//#region src/open-search-server.ts
var OpenSearchServer = class {
	engine;
	host;
	memory;
	real;
	constructor(options = {}) {
		this.engine = options.engine ?? "memory";
		if (this.engine === "opensearch") this.real = new RealOpenSearchServer(options);
		else this.memory = new MemoryOpenSearchServer(options);
		this.host = (this.memory ?? this.real).host;
	}
	get port() {
		return (this.memory ?? this.real).port;
	}
	get endpoint() {
		return (this.memory ?? this.real).endpoint;
	}
	async listen(port) {
		await (this.memory ?? this.real).listen(port);
	}
	async close() {
		await (this.memory ?? this.real).close();
	}
	reset() {
		if (this.memory) {
			this.memory.reset();
			return Promise.resolve();
		}
		return this.real.reset();
	}
};
//#endregion
exports.MemoryOpenSearchServer = MemoryOpenSearchServer;
exports.OpenSearchError = OpenSearchError;
exports.OpenSearchServer = OpenSearchServer;
exports.RealOpenSearchServer = RealOpenSearchServer;
exports.VERSION_3_5_0_MIN = VERSION_3_5_0_MIN;
exports.download = download;
exports.launch = launch;
