//#region src/index.ts
const get = (name, defaultValue) => {
	const value = process.env[name];
	if (typeof value !== "undefined") return value;
	if (typeof defaultValue !== "undefined") return defaultValue;
	throw new TypeError(`Environment variable "${name}" hasn't been set.`);
};
const string = (name, defaultValue) => {
	return String(get(name, defaultValue));
};
const integer = (name, defaultValue) => {
	return parseInt(get(name, defaultValue), 10);
};
const float = (name, defaultValue) => {
	return parseFloat(get(name, defaultValue));
};
const boolean = (name, defaultValue) => {
	const value = get(name, defaultValue);
	if ([
		true,
		1,
		"true",
		"TRUE",
		"yes",
		"1"
	].includes(value)) return true;
	if ([
		false,
		0,
		"false",
		"FALSE",
		"no",
		"0"
	].includes(value)) return false;
	return !!value;
};
const array = (name, defaultValue, sep = ",") => {
	const value = get(name, defaultValue);
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === "string") return value.split(sep).map((item) => String(item).trim());
	throw new TypeError(`Environment variable "${name}" isn't an array.`);
};
const json = (name, defaultValue) => {
	const value = get(name, defaultValue);
	if (typeof value === "object" && value !== null) return value;
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new TypeError(`Environment variable "${name}" isn't valid JSON.`);
	}
};
const enumeration = (name, possibilities, defaultValue) => {
	const value = get(name, defaultValue);
	if (!possibilities.includes(value)) throw new TypeError(`Environment variable "${name}" must contain one of the following values: ${possibilities.join(", ")}.`);
	return value;
};
//#endregion
export { array, boolean, enumeration, float, get, integer, json, string };
