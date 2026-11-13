Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let child_process = require("child_process");
let fs = require("fs");
let fs_promises = require("fs/promises");
let net = require("net");
let os = require("os");
let path = require("path");
let util = require("util");
let module$1 = require("module");
let url = require("url");
//#region src/binary.ts
const getPlatformPackage = () => {
	return `@embedded-postgres/${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`;
};
let binaries;
const locate = async () => {
	const name = getPlatformPackage();
	let entry;
	try {
		const wrapper = (0, fs.realpathSync)((0, module$1.createRequire)(require("url").pathToFileURL(__filename).href).resolve("embedded-postgres"));
		entry = (0, fs.realpathSync)((0, module$1.createRequire)(wrapper).resolve(name));
	} catch (error) {
		throw new Error(`The Postgres binaries aren't installed: "${name}" wasn't found. Install "embedded-postgres" on macOS or Linux.`, { cause: error });
	}
	const root = (0, path.dirname)((0, path.dirname)(entry));
	const { hydrateSymlinks } = await import(
		/* @vite-ignore */
		(0, url.pathToFileURL)((0, path.join)(root, "scripts", "hydrate-symlinks.js")).href
);
	await hydrateSymlinks();
	return await import(
		/* @vite-ignore */
		(0, url.pathToFileURL)(entry).href
);
};
const getBinaries = () => {
	binaries ??= locate().catch((error) => {
		binaries = void 0;
		throw error;
	});
	return binaries;
};
//#endregion
//#region src/postgres-server.ts
const exec = (0, util.promisify)(child_process.execFile);
const USER = "postgres";
const PASSWORD = "postgres";
const DATABASE = "postgres";
const MAX_CONNECTIONS = 500;
const READY = "database system is ready to accept connections";
const TEMPORARY = /^awsless-postgres-(\d+)-/;
const isAlive = (pid) => {
	try {
		process.kill(pid, 0);
	} catch (error) {
		return error.code === "EPERM";
	}
	return true;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const findServerIn = async (dir) => {
	const [line = ""] = (await (0, fs_promises.readFile)((0, path.join)(dir, "postmaster.pid"), "utf8").catch(() => "")).split("\n");
	const pid = Number(line);
	if (!pid || !isAlive(pid)) return;
	const { stdout } = await exec("ps", [
		"-ww",
		"-o",
		"command=",
		"-p",
		String(pid)
	]).catch(() => ({ stdout: "" }));
	return stdout.includes(dir) ? pid : void 0;
};
const stopServer = async (pid) => {
	process.kill(pid, "SIGQUIT");
	for (const deadline = Date.now() + 15e3; isAlive(pid);) {
		if (Date.now() > deadline) {
			process.kill(pid, "SIGKILL");
			break;
		}
		await sleep(50);
	}
};
const reapOrphans = async () => {
	for (const name of await (0, fs_promises.readdir)((0, os.tmpdir)()).catch(() => [])) {
		const owner = TEMPORARY.exec(name);
		if (owner && !isAlive(Number(owner[1]))) {
			const dir = (0, path.join)((0, os.tmpdir)(), name);
			const pid = await findServerIn(dir).catch(() => void 0);
			if (pid) await stopServer(pid).catch(() => {});
			await (0, fs_promises.rm)(dir, {
				recursive: true,
				force: true
			}).catch(() => {});
		}
	}
};
const findFreePort = () => new Promise((resolve, reject) => {
	const server = (0, net.createServer)();
	server.once("error", reject);
	server.listen(0, "127.0.0.1", () => {
		const port = server.address().port;
		server.close(() => resolve(port));
	});
});
const createCluster = async (initdb, dir) => {
	const passwordFile = (0, path.join)(await (0, fs_promises.mkdtemp)((0, path.join)((0, os.tmpdir)(), "awsless-pgpass-")), "password");
	await (0, fs_promises.writeFile)(passwordFile, `${PASSWORD}\n`, { mode: 384 });
	try {
		await exec(initdb, [
			`--pgdata=${dir}`,
			`--username=${USER}`,
			`--pwfile=${passwordFile}`,
			"--auth=scram-sha-256",
			"--encoding=UTF8",
			"--locale=C",
			"--locale-provider=icu",
			"--icu-locale=en-US",
			"--no-instructions",
			"--no-sync"
		], { env: {
			...process.env,
			LC_MESSAGES: "C"
		} });
	} catch (error) {
		const output = error.stderr ?? "";
		throw new Error(`Creating the local Postgres database failed.\n${output}`, { cause: error });
	} finally {
		await (0, fs_promises.rm)((0, path.join)(passwordFile, ".."), {
			recursive: true,
			force: true
		});
	}
};
var PostgresServer = class {
	options;
	host = "127.0.0.1";
	child;
	dir;
	stopping = false;
	boundPort = 0;
	constructor(options = {}) {
		this.options = options;
	}
	get port() {
		return this.boundPort;
	}
	get url() {
		return `postgres://${USER}:${PASSWORD}@${this.host}:${this.boundPort}/${DATABASE}`;
	}
	async listen(port = this.options.port ?? 0) {
		if (this.child) throw new Error("The Postgres server is already listening");
		const binaries = await getBinaries();
		await reapOrphans();
		const dir = await (0, fs_promises.mkdtemp)((0, path.join)((0, os.tmpdir)(), `awsless-postgres-${process.pid}-`));
		this.dir = dir;
		try {
			await createCluster(binaries.initdb, dir);
		} catch (error) {
			await this.close();
			throw error;
		}
		const boundPort = port || await findFreePort();
		const child = (0, child_process.spawn)(binaries.postgres, [
			"-D",
			dir,
			"-p",
			String(boundPort),
			"-c",
			`listen_addresses=${this.host}`,
			"-c",
			"unix_socket_directories=",
			"-c",
			`max_connections=${MAX_CONNECTIONS}`,
			"-c",
			"timezone=UTC",
			"-c",
			"log_timezone=UTC",
			"-c",
			"synchronous_commit=off",
			"-c",
			"fsync=off",
			"-c",
			"full_page_writes=off"
		], {
			env: {
				...process.env,
				LC_MESSAGES: "C"
			},
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		let startup = "";
		const ready = new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(/* @__PURE__ */ new Error("The local Postgres server never became ready.")), 6e4);
			const onData = (data) => {
				const text = data.toString("utf8");
				if (this.boundPort) {
					for (const line of text.split("\n").filter(Boolean)) this.options.onOutput?.(line);
					return;
				}
				startup += text;
				if (startup.includes(READY)) {
					clearTimeout(timeout);
					resolve();
				}
			};
			child.stdout?.on("data", onData);
			child.stderr?.on("data", onData);
			child.once("error", (error) => {
				clearTimeout(timeout);
				reject(error);
			});
			child.once("exit", (code, signal) => {
				const reason = code !== null ? `exited with code ${code}` : `was killed by ${signal}`;
				clearTimeout(timeout);
				reject(/* @__PURE__ */ new Error(`Postgres ${reason} before starting.`));
				if (this.boundPort && !this.stopping) this.options.onExit?.(code, signal);
			});
		});
		const stopOnExit = () => {
			child.kill("SIGQUIT");
			(0, fs.rmSync)(dir, {
				recursive: true,
				force: true
			});
		};
		process.once("exit", stopOnExit);
		child.once("exit", () => process.off("exit", stopOnExit));
		this.child = child;
		try {
			await ready;
		} catch (error) {
			await this.close();
			throw new Error(`${error.message}\n${startup}`, { cause: error });
		}
		this.boundPort = boundPort;
	}
	async close() {
		const child = this.child;
		const dir = this.dir;
		this.child = void 0;
		this.dir = void 0;
		this.boundPort = 0;
		if (child && child.exitCode === null && child.signalCode === null) {
			this.stopping = true;
			await new Promise((resolve) => {
				const timeout = setTimeout(() => child.kill("SIGKILL"), 5e3);
				child.once("exit", () => {
					clearTimeout(timeout);
					resolve(void 0);
				});
				child.kill("SIGQUIT");
			});
			this.stopping = false;
		}
		if (dir) await (0, fs_promises.rm)(dir, {
			recursive: true,
			force: true
		});
	}
};
//#endregion
exports.PostgresServer = PostgresServer;
