import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.js";
import { confirm, intro, isCancel, log, multiselect, note, outro, password, select, text } from "@clack/prompts";
import Table from "cli-table3";
import ansiTruncate from "ansi-truncate";
import ansiLength from "string-length";
import ansiWrap from "wrap-ansi";
import chalk from "chalk";
//#region src/symbols.ts
var symbols_exports = /* @__PURE__ */ __exportAll({
	ellipsis: () => "…",
	error: () => "×",
	info: () => "·",
	message: () => "│",
	step: () => "◇",
	success: () => "◆",
	warning: () => "▲"
});
//#endregion
//#region src/error.ts
var Cancelled = class extends Error {
	constructor() {
		super("cancelled");
	}
};
async function wrapPrompt(cb) {
	const result = await cb();
	if (isCancel(result)) throw new Cancelled();
	return result;
}
//#endregion
//#region src/prompts.ts
var prompts_exports = /* @__PURE__ */ __exportAll({
	confirm: () => confirm$1,
	float: () => float,
	integer: () => integer,
	multiSelect: () => multiSelect,
	password: () => password$1,
	select: () => select$1,
	text: () => text$1
});
const text$1 = async (opts) => {
	return wrapPrompt(() => {
		return text(opts);
	});
};
const password$1 = async (opts) => {
	return wrapPrompt(() => {
		return password({
			mask: "*",
			...opts
		});
	});
};
const integer = async (opts) => {
	const result = await text$1({
		...opts,
		defaultValue: opts.defaultValue?.toString(),
		initialValue: opts.initialValue?.toString(),
		validate(value) {
			if (isNaN(Number(value)) || isNaN(parseInt(value, 10)) || value.includes(".")) return "Invalid integer";
		}
	});
	return parseInt(result, 10);
};
const float = async (opts) => {
	const result = await text$1({
		...opts,
		defaultValue: opts.defaultValue?.toString(),
		initialValue: opts.initialValue?.toString(),
		validate(value) {
			if (isNaN(Number(value)) || isNaN(parseFloat(value))) return "Invalid float";
		}
	});
	return parseFloat(result);
};
const confirm$1 = async (opts) => {
	return wrapPrompt(() => {
		return confirm(opts);
	});
};
const select$1 = async (opts) => {
	return wrapPrompt(() => {
		return select(opts);
	});
};
const multiSelect = async (opts) => {
	return wrapPrompt(() => {
		return multiselect(opts);
	});
};
//#endregion
//#region src/ansi.ts
var ansi_exports = /* @__PURE__ */ __exportAll({
	length: () => length,
	pad: () => pad,
	truncate: () => truncate,
	wrap: () => wrap
});
const wrap = (value, width, options) => {
	return ansiWrap(value, width, options);
};
const length = (value) => {
	return ansiLength(value);
};
const truncate = (value, width) => {
	return value.split("\n").map((line) => ansiTruncate(line, width, { ellipsis: "…" })).join("\n");
};
const pad = (texts) => {
	const size = Math.max(...texts.map((text) => ansiLength(text)));
	return (text, padding = 0, fill) => {
		return text.padEnd(size + padding, fill);
	};
};
//#endregion
//#region src/colors.ts
const color = chalk;
//#endregion
//#region src/logs.ts
var logs_exports = /* @__PURE__ */ __exportAll({
	error: () => error,
	info: () => info,
	intro: () => intro$1,
	list: () => list,
	message: () => message,
	note: () => note$1,
	outro: () => outro$1,
	step: () => step,
	success: () => success,
	table: () => table,
	task: () => task,
	warning: () => warning
});
const endMargin = 3;
const intro$1 = (title = "") => {
	intro(truncate(title, process.stdout.columns - 6 - endMargin));
};
const outro$1 = (title = "") => {
	outro(truncate(title, process.stdout.columns - 6 - endMargin));
};
const note$1 = (title, message) => {
	const width = process.stdout.columns - 6 - endMargin;
	note(wrap(message, width, { hard: true }), truncate(title, width));
};
const logMessage = (symbol, message) => {
	log.message(wrap(message, process.stdout.columns - 6 - endMargin, {
		hard: true,
		trim: false
	}), { symbol });
};
const message = (message, symbol = color.gray("│")) => logMessage(symbol, message);
const error = (message) => logMessage(color.red("×"), message);
const info = (message) => logMessage(color.blue("·"), message);
const step = (message) => logMessage(color.green("◇"), message);
const warning = (message) => logMessage(color.yellow("▲"), message);
const success = (message) => logMessage(color.green("◆"), message);
const list = (title, data) => {
	const padName = pad(Object.keys(data));
	note$1(title, Object.entries(data).map(([name, value]) => {
		return color.reset.whiteBright.bold(padName(name + ":", 2)) + value;
	}).join("\n"));
};
const spinner = (opts = {}) => {
	const frames = [
		"◒",
		"◐",
		"◓",
		"◑"
	];
	const interactive = process.stdout.isTTY && process.env.CI !== "true";
	let text = "";
	let frame = 0;
	let dots = 0;
	let timer;
	let started = false;
	const render = () => {
		const trail = ".".repeat(Math.floor(dots)).slice(0, 3);
		process.stdout.write(`\r\x1b[2K${color.magenta(frames[frame])}  ${text}${trail}`);
		frame = frame + 1 < frames.length ? frame + 1 : 0;
		dots = dots < frames.length ? dots + .125 : 0;
	};
	const onData = (data) => {
		if (data.toString() === "") opts.onCancel?.();
	};
	return {
		start(message = "") {
			started = true;
			text = message;
			process.stdout.write(`${color.gray("│")}\n`);
			if (interactive) {
				process.stdout.write("\x1B[?25l");
				render();
				timer = setInterval(render, 80);
			} else process.stdout.write(`${color.magenta(frames[0])}  ${text}...\n`);
			if (process.stdin.isTTY) {
				process.stdin.setRawMode(true);
				process.stdin.on("data", onData);
				process.stdin.resume();
			}
		},
		message(message = "") {
			text = message;
		},
		stop(message = "", code = 0) {
			if (!started) return;
			started = false;
			if (process.stdin.isTTY) {
				process.stdin.off("data", onData);
				process.stdin.setRawMode(false);
				process.stdin.pause();
			}
			const symbol = code === 0 ? color.green("◇") : code === 1 ? color.red("■") : color.red("×");
			if (interactive) {
				clearInterval(timer);
				process.stdout.write(`\r\x1b[2K${symbol}  ${message || text}\n\x1b[?25h`);
			} else process.stdout.write(`${symbol}  ${message || text}\n`);
		}
	};
};
const task = async (opts) => {
	let initialMessage = opts.initialMessage;
	let successMessage = opts.successMessage;
	let errorMessage = opts.errorMessage;
	let cancel;
	const cancelled = new Promise((_, reject) => {
		cancel = () => reject(new Cancelled());
	});
	const spin = spinner({ onCancel: () => cancel() });
	spin.start(truncate(opts.initialMessage, process.stdout.columns - 6 - endMargin));
	const stop = (message, code) => {
		spin.stop(truncate(message ?? initialMessage, process.stdout.columns - 6 - endMargin), code);
	};
	const work = opts.task({
		updateMessage(m) {
			spin.message(truncate(m, process.stdout.columns - 6 - endMargin));
			initialMessage = m;
		},
		updateSuccessMessage(m) {
			successMessage = m;
		},
		updateErrorMessage(m) {
			errorMessage = m;
		}
	});
	try {
		const result = await Promise.race([work, cancelled]);
		stop(successMessage);
		return result;
	} catch (error) {
		if (error instanceof Cancelled) {
			work.catch(() => {});
			stop(initialMessage, 1);
		} else stop(errorMessage, 2);
		throw error;
	}
};
const table = (props) => {
	log.message();
	const length$1 = Math.max(props.head.length, ...props.body.map((b) => b.length));
	const padding = 2;
	const totalPadding = 4 * length$1;
	const totalBorder = (length$1 - 1) * 1 + 2;
	const maxTableSize = process.stdout.columns - totalPadding - totalBorder - endMargin;
	const contentSizes = Array.from({ length: length$1 }).map((_, i) => {
		return Math.max(length(props.head[i] ?? ""), ...props.body.map((b) => length(String(b[i]))));
	});
	const columnSizes = Array.from({ length: length$1 }).map(() => {
		return 0;
	});
	let leftover = Math.min(maxTableSize, contentSizes.reduce((total, size) => total + size, 0));
	while (leftover > 0) for (const x in columnSizes) {
		const columnSize = columnSizes[x];
		const contentSize = contentSizes[x];
		if (leftover > 0 && columnSize < contentSize) {
			leftover--;
			columnSizes[x] = columnSize + 1;
		}
	}
	const table = new Table({
		head: props.head.map((value, x) => "\n" + color.reset.whiteBright.bold(wrap(value, columnSizes[x], { hard: true }))),
		style: {
			"padding-left": padding,
			"padding-right": padding
		},
		chars: {
			"bottom-right": "╯",
			"top-right": "╮",
			"top-left": "├",
			"bottom-left": "├"
		}
	});
	table.push(...props.body.map((row) => {
		return row.map((value, x) => {
			if (typeof value === "boolean") return value ? color.green("yes") : color.red("no");
			if (typeof value === "number") return color.blue(value);
			return wrap(value, columnSizes[x], { hard: true });
		});
	}));
	console.log(table.toString());
};
//#endregion
export { Cancelled, ansi_exports as ansi, color, logs_exports as log, prompts_exports as prompt, symbols_exports as symbol };
