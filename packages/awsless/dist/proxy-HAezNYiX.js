//#region src/lib/proxy.ts
const RESERVED = /* @__PURE__ */ new Set([
	"then",
	"toJSON",
	"toString",
	"valueOf"
]);
const createProxy = /* @__NO_SIDE_EFFECTS__ */ (cb) => {
	const cache = /* @__PURE__ */ new Map();
	return new Proxy({}, { get(_, name) {
		if (typeof name === "symbol" || RESERVED.has(name)) return;
		if (!cache.has(name)) cache.set(name, cb(name));
		return cache.get(name);
	} });
};
//#endregion
export { createProxy as t };
