import { BigFloat } from "@awsless/big-float";
//#region src/type.d.ts
type ClickHouseType = {
  name: string;
  args: string[];
};
declare const parseType: (text: string) => ClickHouseType;
declare const unwrapType: (type: ClickHouseType) => ClickHouseType;
declare const isBigInteger: (name: string) => boolean;
declare const isDecimal: (name: string) => boolean;
declare const isDateTime: (name: string) => name is "DateTime" | "DateTime64";
declare const tupleField: (field: string) => {
  name?: string;
  type: string;
};
type ClickHouseDecimal = BigFloat;
declare const decodeValue: (text: string, value: unknown) => unknown;
//#endregion
export { ClickHouseDecimal, ClickHouseType, decodeValue, isBigInteger, isDateTime, isDecimal, parseType, tupleField, unwrapType };