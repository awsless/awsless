//#region src/client.ts
const globalClient = (factory) => {
	let singleton;
	const getter = () => {
		if (!singleton) singleton = factory();
		return singleton;
	};
	getter.set = (client) => {
		singleton = client;
	};
	return getter;
};
//#endregion
//#region src/mock.ts
const getVitest = (provided) => {
	const vi = provided ?? globalThis.vi;
	if (!vi) throw new Error("Enable vitest globals or pass vi explicitly (vi.fn for mockFn and mockObjectValues).");
	return vi;
};
const mockObjectValues = (object, createMock) => {
	const list = {};
	for (const [key, value] of Object.entries(object)) list[key] = mockFn(value, createMock);
	return Object.freeze(list);
};
const mockFn = (fn, createMock) => {
	return (createMock ?? getVitest().fn)(fn);
};
const nextTick = async (fn, ...args) => {
	await new Promise((resolve) => setTimeout(resolve, 0));
	return fn(...args);
};
//#endregion
export { getVitest, globalClient, mockFn, mockObjectValues, nextTick };
