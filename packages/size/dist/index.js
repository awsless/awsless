// src/size.ts
var BI = 1024n;
var KIBI = BI;
var MEBI = KIBI * BI;
var GIBI = MEBI * BI;
var TEBI = GIBI * BI;
var PEBI = TEBI * BI;
var Size = class {
  constructor(value) {
    this.value = value;
  }
};
var bytes = (value) => {
  return new Size(BigInt(value));
};
var kibibytes = (value) => {
  return new Size(BigInt(value) * KIBI);
};
var mebibytes = (value) => {
  return new Size(BigInt(value) * MEBI);
};
var gibibytes = (value) => {
  return new Size(BigInt(value) * GIBI);
};
var tebibytes = (value) => {
  return new Size(BigInt(value) * TEBI);
};
var pebibytes = (value) => {
  return new Size(BigInt(value) * PEBI);
};
var toBytes = (size) => {
  return Number(toSafeBytes(size));
};
var toKibibytes = (size) => {
  return Number(toSafeKibibytes(size));
};
var toMebibytes = (size) => {
  return Number(toSafeMebibytes(size));
};
var toGibibytes = (size) => {
  return Number(toSafeGibibytes(size));
};
var toTebibytes = (size) => {
  return Number(toSafeTebibytes(size));
};
var toPebibytes = (size) => {
  return Number(toSafePebibytes(size));
};
var toSafeBytes = (size) => {
  return size.value;
};
var toSafeKibibytes = (size) => {
  return size.value / KIBI;
};
var toSafeMebibytes = (size) => {
  return size.value / MEBI;
};
var toSafeGibibytes = (size) => {
  return size.value / GIBI;
};
var toSafeTebibytes = (size) => {
  return size.value / TEBI;
};
var toSafePebibytes = (size) => {
  return size.value / PEBI;
};

// src/parse.ts
var parse = (value) => {
  const [count, unit] = value.split(/\s+/);
  if (count && unit) {
    const number = BigInt(count);
    switch (unit) {
      case "B":
        return bytes(number);
      case "KB":
      case "KiB":
        return kibibytes(number);
      case "MB":
      case "MiB":
        return mebibytes(number);
      case "GB":
      case "GiB":
        return gibibytes(number);
      case "TB":
      case "TiB":
        return tebibytes(number);
      case "PB":
      case "PiB":
        return pebibytes(number);
    }
  }
  throw new SyntaxError(`Invalid size: ${value}`);
};
export {
  Size,
  bytes,
  gibibytes,
  kibibytes,
  mebibytes,
  parse,
  pebibytes,
  tebibytes,
  toBytes,
  toGibibytes,
  toKibibytes,
  toMebibytes,
  toPebibytes,
  toSafeBytes,
  toSafeGibibytes,
  toSafeKibibytes,
  toSafeMebibytes,
  toSafePebibytes,
  toSafeTebibytes,
  toTebibytes
};
