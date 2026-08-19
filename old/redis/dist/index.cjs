Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _heat_request_port = require("@heat/request-port");
let ioredis = require("ioredis");
let redis_memory_server = require("redis-memory-server");
//#region src/client.ts
let optionOverrides = {};
const overrideOptions = (options) => {
	optionOverrides = options;
};
const redisClient = (options) => {
	const props = {
		tls: {},
		lazyConnect: true,
		stringNumbers: true,
		keepAlive: 0,
		noDelay: true,
		enableReadyCheck: false,
		maxRetriesPerRequest: 3,
		autoResubscribe: false,
		autoResendUnfulfilledCommands: false,
		connectTimeout: 5e3,
		commandTimeout: 5e3,
		...options,
		...optionOverrides
	};
	if (!props.cluster) return new ioredis.Redis(props);
	return new ioredis.Cluster([{
		host: props.host,
		port: props.port
	}], {
		dnsLookup: (address, callback) => callback(null, address),
		slotsRefreshTimeout: 5e3,
		enableReadyCheck: false,
		clusterRetryStrategy(times) {
			if (times > 5) return null;
			return Math.min(times * 200, 2e3);
		},
		redisOptions: props
	});
};
//#endregion
//#region src/server.ts
var RedisServer = class {
	client;
	process;
	async start(port) {
		if (this.process) throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`);
		if (port && (port < 0 || port >= 65536)) throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`);
		this.process = await redis_memory_server.RedisMemoryServer.create({ instance: {
			port,
			args: []
		} });
	}
	async kill() {
		if (this.process) {
			await this.client?.disconnect();
			await this.process.stop();
			this.process = void 0;
		}
	}
	async ping() {
		return await (await this.getClient()).ping() === "PONG";
	}
	async getClient() {
		if (!this.client) this.client = new ioredis.Redis({
			host: await this.process?.getHost(),
			port: await this.process?.getPort(),
			stringNumbers: true,
			keepAlive: 0,
			noDelay: true,
			enableReadyCheck: false,
			maxRetriesPerRequest: null
		});
		return this.client;
	}
};
//#endregion
//#region src/mock.ts
const mockRedis = () => {
	const server = new RedisServer();
	let releasePort;
	beforeAll && beforeAll(async () => {
		const [port, release] = await (0, _heat_request_port.requestPort)();
		releasePort = release;
		await server.start(port);
		await server.ping();
		overrideOptions({
			port,
			host: "localhost",
			cluster: false,
			tls: void 0,
			commandQueue: false,
			offlineQueue: false
		});
	}, 3e4);
	afterAll && afterAll(async () => {
		await server.kill();
		await releasePort();
	}, 3e4);
};
//#endregion
//#region src/commands.ts
const command = async (options, callback) => {
	const client = redisClient(options);
	let result;
	try {
		result = await callback(client);
	} catch (error) {
		throw error;
	} finally {
		await client.quit();
	}
	return result;
};
//#endregion
Object.defineProperty(exports, "Cluster", {
	enumerable: true,
	get: function() {
		return ioredis.Cluster;
	}
});
Object.defineProperty(exports, "Redis", {
	enumerable: true,
	get: function() {
		return ioredis.Redis;
	}
});
exports.command = command;
exports.mockRedis = mockRedis;
exports.redisClient = redisClient;
