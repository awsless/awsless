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
const mockObjectValues = (object) => {
	const list = {};
	Object.entries(object).forEach(([key, value]) => {
		list[key] = mockFn(value);
	});
	return Object.freeze(list);
};
const mockFn = (fn) => {
	return vi ? vi.fn(fn) : fn;
};
const nextTick = (fn, ...args) => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(fn(...args));
		}, 0);
	});
};
//#endregion
export { globalClient, mockFn, mockObjectValues, nextTick };
