import { CloudWatchClient, GetMetricStatisticsCommand, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { mockClient } from "aws-sdk-client-mock";
import { globalClient } from "@awsless/utils";
import { milliSeconds, toMilliSeconds, toSeconds } from "@awsless/duration";
import { bytes, toBytes } from "@awsless/size";
//#region src/mock.ts
const mockCloudWatch = () => {
	mockClient(CloudWatchClient).on(PutMetricDataCommand).callsFake((_input) => {}).on(GetMetricStatisticsCommand).callsFake((_input) => {
		return { Datapoints: [] };
	});
};
//#endregion
//#region src/client.ts
const cloudWatchClient = globalClient(() => {
	return new CloudWatchClient({});
});
//#endregion
//#region src/command/create-metric.ts
const createMetric = (props) => {
	return {
		resolution: "standard",
		unit: "number",
		decode: (v) => v,
		encode: (v) => v,
		...props
	};
};
const createDurationMetric = (props) => {
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
const createSizeMetric = (props) => {
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
//#endregion
//#region src/util/unit.ts
const toStandedUnit = (unit) => {
	switch (unit) {
		case "number": return "None";
		case "count": return "Count";
		case "size": return "Bytes";
		case "duration": return "Milliseconds";
		case "percent": return "Percent";
	}
};
//#endregion
//#region src/command/command.ts
const thenable = (callback) => {
	let promise;
	return { then(onfulfilled, onrejected) {
		return (promise ?? (promise = callback())).then(onfulfilled, onrejected);
	} };
};
//#endregion
//#region src/command/put-metric-data.ts
const putData = (metric, value, { time, dimentions = {}, client = cloudWatchClient() } = {}) => {
	const datum = {
		MetricName: metric.name,
		Unit: toStandedUnit(metric.unit),
		Timestamp: time,
		StorageResolution: metric.resolution === "high" ? 1 : 60,
		Values: (Array.isArray(value) ? value : [value]).map(metric.decode),
		Dimensions: Object.entries(dimentions).map(([name, value]) => ({
			Name: name,
			Value: value
		}))
	};
	return {
		batchable: () => ({
			namespace: metric.namespace,
			datum
		}),
		...thenable(async () => {
			await client.send(new PutMetricDataCommand({
				Namespace: metric.namespace,
				MetricData: [datum]
			}));
		})
	};
};
//#endregion
//#region src/command/batch-put-metric-data.ts
const batchPutData = async (data, { client = cloudWatchClient() } = {}) => {
	const entries = data.map((i) => i.batchable());
	const namespaces = entries.map((i) => i.namespace);
	if (new Set(namespaces).size > 1) throw new TypeError(`Batching for multiple namespaces isn't supported`);
	await client.send(new PutMetricDataCommand({
		Namespace: namespaces[0],
		MetricData: entries.map((i) => i.datum)
	}));
};
//#endregion
//#region src/command/get-statistics.ts
const getStatistics = async (metric, { start, end, period, unit, dimentions = {}, client = cloudWatchClient() }) => {
	const differentDisplayUnit = unit && unit !== metric.unit;
	const isPercent = (unit ?? metric.unit) === "percent";
	const stats = isPercent ? { ExtendedStatistics: [
		"p50",
		"p75",
		"p95",
		"p90",
		"p99",
		"p100"
	] } : { Statistics: [
		"SampleCount",
		"Average",
		"Sum",
		"Minimum",
		"Maximum"
	] };
	const result = await client.send(new GetMetricStatisticsCommand({
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
	}));
	const encode = (value) => {
		if (!differentDisplayUnit && typeof value === "number") return metric.encode(value);
		return value;
	};
	const points = result.Datapoints ?? [];
	if (isPercent) return points.map((value) => ({
		time: value.Timestamp,
		p50: value.ExtendedStatistics?.p50,
		p75: value.ExtendedStatistics?.p75,
		p95: value.ExtendedStatistics?.p95,
		p90: value.ExtendedStatistics?.p90,
		p99: value.ExtendedStatistics?.p99,
		p100: value.ExtendedStatistics?.p100,
		count: encode(value.SampleCount)
	}));
	return points.map((value) => ({
		time: value.Timestamp,
		average: encode(value.Average),
		min: encode(value.Minimum),
		max: encode(value.Maximum),
		sum: encode(value.Sum),
		count: encode(value.SampleCount)
	}));
};
//#endregion
export { batchPutData, cloudWatchClient, createDurationMetric, createMetric, createSizeMetric, getStatistics, mockCloudWatch, putData };
