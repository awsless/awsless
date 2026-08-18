//#region src/size.ts
const BI = 1024n;
const KIBI = BI;
const MEBI = KIBI * BI;
const GIBI = MEBI * BI;
const TEBI = GIBI * BI;
const PEBI = TEBI * BI;
var Size = class {
	value;
	constructor(value) {
		this.value = value;
	}
};
const bytes = (value) => {
	return new Size(BigInt(value));
};
const kibibytes = (value) => {
	return new Size(BigInt(value) * KIBI);
};
const mebibytes = (value) => {
	return new Size(BigInt(value) * MEBI);
};
const gibibytes = (value) => {
	return new Size(BigInt(value) * GIBI);
};
const tebibytes = (value) => {
	return new Size(BigInt(value) * TEBI);
};
const pebibytes = (value) => {
	return new Size(BigInt(value) * PEBI);
};
const toBytes = (size) => {
	return Number(toSafeBytes(size));
};
const toKibibytes = (size) => {
	return Number(toSafeKibibytes(size));
};
const toMebibytes = (size) => {
	return Number(toSafeMebibytes(size));
};
const toGibibytes = (size) => {
	return Number(toSafeGibibytes(size));
};
const toTebibytes = (size) => {
	return Number(toSafeTebibytes(size));
};
const toPebibytes = (size) => {
	return Number(toSafePebibytes(size));
};
const toSafeBytes = (size) => {
	return size.value;
};
const toSafeKibibytes = (size) => {
	return size.value / KIBI;
};
const toSafeMebibytes = (size) => {
	return size.value / MEBI;
};
const toSafeGibibytes = (size) => {
	return size.value / GIBI;
};
const toSafeTebibytes = (size) => {
	return size.value / TEBI;
};
const toSafePebibytes = (size) => {
	return size.value / PEBI;
};
//#endregion
//#region src/parse.ts
const parse = (value) => {
	const [count, unit] = value.split(/\s+/);
	if (count && unit) {
		const number = BigInt(count);
		switch (unit) {
			case "B": return bytes(number);
			case "KB":
			case "KiB": return kibibytes(number);
			case "MB":
			case "MiB": return mebibytes(number);
			case "GB":
			case "GiB": return gibibytes(number);
			case "TB":
			case "TiB": return tebibytes(number);
			case "PB":
			case "PiB": return pebibytes(number);
		}
	}
	throw new SyntaxError(`Invalid size: ${value}`);
};
//#endregion
//#region src/format.ts
const UNITS = [
	"B",
	"KB",
	"MB",
	"GB",
	"TB",
	"PB"
];
const format = (size) => {
	let value = Number(size.value);
	let index = 0;
	while (value >= 1024 && index < UNITS.length - 1) {
		value = value / 1024;
		index++;
	}
	return `${Math.round(value * 100) / 100} ${UNITS[index]}`;
};
//#endregion
export { Size, bytes, format, gibibytes, kibibytes, mebibytes, parse, pebibytes, tebibytes, toBytes, toGibibytes, toKibibytes, toMebibytes, toPebibytes, toSafeBytes, toSafeGibibytes, toSafeKibibytes, toSafeMebibytes, toSafePebibytes, toSafeTebibytes, toTebibytes };
