// src/mock.ts
import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  PutMetricDataCommand
} from "@aws-sdk/client-cloudwatch";
import { mockClient } from "aws-sdk-client-mock";
var mockCloudWatch = () => {
  mockClient(CloudWatchClient).on(PutMetricDataCommand).callsFake((_input) => {
  }).on(GetMetricStatisticsCommand).callsFake((_input) => {
    return {
      Datapoints: []
    };
  });
};

// src/client.ts
import { CloudWatchClient as CloudWatchClient2 } from "@aws-sdk/client-cloudwatch";
import { globalClient } from "@awsless/utils";
var cloudWatchClient = globalClient(() => {
  return new CloudWatchClient2({});
});

// src/command/create-metric.ts
import { milliSeconds, toMilliSeconds } from "@awsless/duration";
import { bytes, toBytes } from "@awsless/size";
var createMetric = (props) => {
  return {
    resolution: "standard",
    unit: "number",
    decode: (v) => v,
    encode: (v) => v,
    ...props
  };
};
var createDurationMetric = (props) => {
  return createMetric({
    ...props,
    unit: "duration",
    encode(value) {
      return milliSeconds(value);
    },
    decode(value) {
      return toMilliSeconds(value);
    }
  });
};
var createSizeMetric = (props) => {
  return createMetric({
    ...props,
    unit: "size",
    encode(value) {
      return bytes(value);
    },
    decode(value) {
      return toBytes(value);
    }
  });
};

// src/command/put-metric-data.ts
import { PutMetricDataCommand as PutMetricDataCommand2 } from "@aws-sdk/client-cloudwatch";

// src/util/unit.ts
var toStandedUnit = (unit) => {
  switch (unit) {
    case "number":
      return "None";
    case "count":
      return "Count";
    case "size":
      return "Bytes";
    case "duration":
      return "Milliseconds";
    case "percent":
      return "Percent";
  }
};

// src/command/command.ts
var thenable = (callback) => {
  let promise;
  return {
    then(onfulfilled, onrejected) {
      return (promise ?? (promise = callback())).then(onfulfilled, onrejected);
    }
  };
};

// src/command/put-metric-data.ts
var putData = (metric, value, { time, dimentions = {}, client = cloudWatchClient() } = {}) => {
  const datum = {
    MetricName: metric.name,
    Unit: toStandedUnit(metric.unit),
    Timestamp: time,
    StorageResolution: metric.resolution === "high" ? 1 : 60,
    Values: (Array.isArray(value) ? value : [value]).map(metric.decode),
    Dimensions: Object.entries(dimentions).map(([name, value2]) => ({
      Name: name,
      Value: value2
    }))
  };
  return {
    batchable: () => ({
      namespace: metric.namespace,
      datum
    }),
    ...thenable(async () => {
      await client.send(
        new PutMetricDataCommand2({
          Namespace: metric.namespace,
          MetricData: [datum]
        })
      );
    })
  };
};

// src/command/batch-put-metric-data.ts
import { PutMetricDataCommand as PutMetricDataCommand3 } from "@aws-sdk/client-cloudwatch";
var batchPutData = async (data, { client = cloudWatchClient() } = {}) => {
  const entries = data.map((i) => i.batchable());
  const namespaces = entries.map((i) => i.namespace);
  if (new Set(namespaces).size > 1) {
    throw new TypeError(`Batching for multiple namespaces isn't supported`);
  }
  await client.send(
    new PutMetricDataCommand3({
      Namespace: namespaces[0],
      MetricData: entries.map((i) => i.datum)
    })
  );
};

// src/command/get-statistics.ts
import { GetMetricStatisticsCommand as GetMetricStatisticsCommand2 } from "@aws-sdk/client-cloudwatch";
import { toSeconds } from "@awsless/duration";
var getStatistics = async (metric, { start, end, period, unit, dimentions = {}, client = cloudWatchClient() }) => {
  const differentDisplayUnit = unit && unit !== metric.unit;
  const isPercent = (unit ?? metric.unit) === "percent";
  const stats = isPercent ? { ExtendedStatistics: ["p50", "p75", "p95", "p90", "p99", "p100"] } : { Statistics: ["SampleCount", "Average", "Sum", "Minimum", "Maximum"] };
  const result = await client.send(
    new GetMetricStatisticsCommand2({
      ...stats,
      Namespace: metric.namespace,
      MetricName: metric.name,
      Unit: toStandedUnit(unit ?? metric.unit),
      Period: toSeconds(period),
      EndTime: end,
      StartTime: start,
      Dimensions: Object.entries(dimentions).map(([name, value]) => ({
        Name: name,
        Value: value
      }))
    })
  );
  const encode = (value) => {
    if (!differentDisplayUnit && typeof value === "number") {
      return metric.encode(value);
    }
    return value;
  };
  const points = result.Datapoints ?? [];
  if (isPercent) {
    return points.map((value) => ({
      time: value.Timestamp,
      p50: value.ExtendedStatistics?.p50,
      p75: value.ExtendedStatistics?.p75,
      p95: value.ExtendedStatistics?.p95,
      p90: value.ExtendedStatistics?.p90,
      p99: value.ExtendedStatistics?.p99,
      p100: value.ExtendedStatistics?.p100,
      count: encode(value.SampleCount)
    }));
  }
  return points.map((value) => ({
    time: value.Timestamp,
    average: encode(value.Average),
    min: encode(value.Minimum),
    max: encode(value.Maximum),
    sum: encode(value.Sum),
    count: encode(value.SampleCount)
  }));
};
export {
  batchPutData,
  cloudWatchClient,
  createDurationMetric,
  createMetric,
  createSizeMetric,
  getStatistics,
  mockCloudWatch,
  putData
};
