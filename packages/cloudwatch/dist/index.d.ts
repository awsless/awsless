import { CloudWatchClient, MetricDatum } from "@aws-sdk/client-cloudwatch";
import { Duration } from "@awsless/duration";
import { Size } from "@awsless/size";
//#region src/mock.d.ts
declare const mockCloudWatch: () => void;
//#endregion
//#region src/client.d.ts
declare const cloudWatchClient: {
  (): CloudWatchClient;
  set(client: CloudWatchClient): void;
};
//#endregion
//#region src/util/unit.d.ts
type Unit = 'number' | 'size' | 'duration';
type DisplayUnit = Unit | 'count' | 'percent';
//#endregion
//#region src/command/create-metric.d.ts
type CreateMetricProps<T = number> = {
  namespace: string;
  name: string;
  unit?: Unit;
  resolution?: 'standard' | 'high';
  decode?: (value: T) => number;
  encode?: (value: number) => T;
};
type Metric<T> = {
  namespace: string;
  name: string;
  unit: Unit;
  resolution: 'standard' | 'high';
  decode: (value: T) => number;
  encode: (value: number) => T;
};
declare const createMetric: <T = number>(props: CreateMetricProps<T>) => Metric<T>;
type PartialProps<T> = Pick<CreateMetricProps<T>, 'name' | 'namespace' | 'resolution'>;
declare const createDurationMetric: (props: PartialProps<Duration>) => Metric<Duration>;
declare const createSizeMetric: (props: PartialProps<Size>) => Metric<Size>;
//#endregion
//#region src/command/put-metric-data.d.ts
type PutDataProps = {
  client?: CloudWatchClient;
  dimentions?: Record<string, string>;
  time?: Date;
};
declare const putData: <T>(metric: Metric<T>, value: T | T[], { time, dimentions, client }?: PutDataProps) => {
  then<Result1 = void, Result2 = never>(onfulfilled: (value: void) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
  batchable: () => {
    namespace: string;
    datum: MetricDatum;
  };
};
//#endregion
//#region src/command/batch-put-metric-data.d.ts
type BatchPutDataProps = {
  client?: CloudWatchClient;
};
declare const batchPutData: <N extends string>(data: {
  batchable(): {
    namespace: N;
    datum: MetricDatum;
  };
}[], { client }?: BatchPutDataProps) => Promise<void>;
//#endregion
//#region src/command/get-statistics.d.ts
type GetStatisticsProps = {
  start: Date;
  end: Date;
  period: Duration;
  unit?: DisplayUnit;
  dimentions?: Record<string, string>;
  client?: CloudWatchClient;
};
declare const getStatistics: <T>(metric: Metric<T>, { start, end, period, unit, dimentions, client }: GetStatisticsProps) => Promise<{
  time: Date | undefined;
  p50: number | undefined;
  p75: number | undefined;
  p95: number | undefined;
  p90: number | undefined;
  p99: number | undefined;
  p100: number | undefined;
  count: number | T | undefined;
}[] | {
  time: Date | undefined;
  average: number | T | undefined;
  min: number | T | undefined;
  max: number | T | undefined;
  sum: number | T | undefined;
  count: number | T | undefined;
}[]>;
//#endregion
export { type BatchPutDataProps, type CreateMetricProps, type GetStatisticsProps, type Metric, type PutDataProps, type Unit, batchPutData, cloudWatchClient, createDurationMetric, createMetric, createSizeMetric, getStatistics, mockCloudWatch, putData };