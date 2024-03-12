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
declare const toBytes: (size: Size) => bigint;
declare const toKibibytes: (size: Size) => bigint;
declare const toMebibytes: (size: Size) => bigint;
declare const toGibibytes: (size: Size) => bigint;
declare const toTebibytes: (size: Size) => bigint;
declare const toPebibytes: (size: Size) => bigint;

type BinarySizeUnit = 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB' | 'PiB';
type DecimalSizeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';
type SizeUnit = BinarySizeUnit | DecimalSizeUnit;
type SizeFormat = `${number} ${SizeUnit}`;
declare const parse: (value: SizeFormat) => Size;

export { Size, SizeFormat, SizeUnit, bytes, gibibytes, kibibytes, mebibytes, parse, pebibytes, tebibytes, toBytes, toGibibytes, toKibibytes, toMebibytes, toPebibytes, toTebibytes };
