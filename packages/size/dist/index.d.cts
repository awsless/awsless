//#region src/size.d.ts
declare class Size {
  readonly value: bigint;
  constructor(value: bigint);
}
declare const bytes: (value: number | bigint) => Size;
declare const kibibytes: (value: number | bigint) => Size;
declare const mebibytes: (value: number | bigint) => Size;
declare const gibibytes: (value: number | bigint) => Size;
declare const tebibytes: (value: number | bigint) => Size;
declare const pebibytes: (value: number | bigint) => Size;
declare const toBytes: (size: Size) => number;
declare const toKibibytes: (size: Size) => number;
declare const toMebibytes: (size: Size) => number;
declare const toGibibytes: (size: Size) => number;
declare const toTebibytes: (size: Size) => number;
declare const toPebibytes: (size: Size) => number;
declare const toSafeBytes: (size: Size) => bigint;
declare const toSafeKibibytes: (size: Size) => bigint;
declare const toSafeMebibytes: (size: Size) => bigint;
declare const toSafeGibibytes: (size: Size) => bigint;
declare const toSafeTebibytes: (size: Size) => bigint;
declare const toSafePebibytes: (size: Size) => bigint;
//#endregion
//#region src/parse.d.ts
type BinarySizeUnit = 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB' | 'PiB';
type DecimalSizeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';
type SizeUnit = BinarySizeUnit | DecimalSizeUnit;
type SizeFormat = `${number} ${SizeUnit}`;
declare const parse: (value: SizeFormat) => Size;
//#endregion
//#region src/format.d.ts
declare const format: (size: Size) => SizeFormat;
//#endregion
export { Size, SizeFormat, SizeUnit, bytes, format, gibibytes, kibibytes, mebibytes, parse, pebibytes, tebibytes, toBytes, toGibibytes, toKibibytes, toMebibytes, toPebibytes, toSafeBytes, toSafeGibibytes, toSafeKibibytes, toSafeMebibytes, toSafePebibytes, toSafeTebibytes, toTebibytes };