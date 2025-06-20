"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Cancelled: () => Cancelled,
  ansi: () => ansi_exports,
  color: () => color,
  log: () => logs_exports,
  prompt: () => prompts_exports,
  symbol: () => symbols_exports
});
module.exports = __toCommonJS(index_exports);

// src/symbols.ts
var symbols_exports = {};
__export(symbols_exports, {
  error: () => error,
  info: () => info,
  step: () => step,
  success: () => success,
  warning: () => warning
});
var step = "\u25C7";
var error = "\xD7";
var success = "\u25C6";
var warning = "\u25B2";
var info = "\xB7";

// src/prompts.ts
var prompts_exports = {};
__export(prompts_exports, {
  confirm: () => confirm,
  float: () => float,
  integer: () => integer,
  multiSelect: () => multiSelect,
  password: () => password,
  select: () => select,
  text: () => text
});
var import_prompts2 = require("@clack/prompts");

// src/error.ts
var import_prompts = require("@clack/prompts");
var Cancelled = class extends Error {
  constructor() {
    super("cancelled");
  }
};
async function wrapPrompt(cb) {
  const result = await cb();
  if ((0, import_prompts.isCancel)(result)) {
    throw new Cancelled();
  }
  return result;
}

// src/prompts.ts
var text = async (opts) => {
  return wrapPrompt(() => {
    return (0, import_prompts2.text)(opts);
  });
};
var password = async (opts) => {
  return wrapPrompt(() => {
    return (0, import_prompts2.password)({ mask: "*", ...opts });
  });
};
var integer = async (opts) => {
  const result = await text({
    ...opts,
    defaultValue: opts.defaultValue?.toString(),
    initialValue: opts.initialValue?.toString(),
    validate(value) {
      if (isNaN(Number(value)) || isNaN(parseInt(value, 10)) || value.includes(".")) {
        return "Invalid integer";
      }
      return;
    }
  });
  return parseInt(result, 10);
};
var float = async (opts) => {
  const result = await text({
    ...opts,
    defaultValue: opts.defaultValue?.toString(),
    initialValue: opts.initialValue?.toString(),
    validate(value) {
      if (isNaN(Number(value)) || isNaN(parseFloat(value))) {
        return "Invalid float";
      }
      return;
    }
  });
  return parseFloat(result);
};
var confirm = async (opts) => {
  return wrapPrompt(() => {
    return (0, import_prompts2.confirm)(opts);
  });
};
var select = async (opts) => {
  return wrapPrompt(() => {
    return (0, import_prompts2.select)(opts);
  });
};
var multiSelect = async (opts) => {
  return wrapPrompt(() => {
    return (0, import_prompts2.multiselect)(opts);
  });
};

// src/logs.ts
var logs_exports = {};
__export(logs_exports, {
  error: () => error2,
  info: () => info2,
  intro: () => intro,
  list: () => list,
  message: () => message,
  note: () => note,
  outro: () => outro,
  step: () => step2,
  success: () => success2,
  table: () => table,
  task: () => task,
  warning: () => warning2
});
var import_prompts3 = require("@clack/prompts");
var import_cli_table3 = __toESM(require("cli-table3"), 1);

// src/ansi.ts
var ansi_exports = {};
__export(ansi_exports, {
  padString: () => padString,
  stringLength: () => import_string_length.default,
  subString: () => subString,
  wrapString: () => wrapString
});
var import_ansi_substring = __toESM(require("ansi-substring"), 1);
var import_string_length = __toESM(require("string-length"), 1);
var import_wrap_ansi = __toESM(require("wrap-ansi"), 1);
var wrapString = (lines, width, options) => {
  return (0, import_wrap_ansi.default)(typeof lines === "string" ? lines : lines.join("\n"), width, options);
};
var subString = (message2, width) => {
  const length = (0, import_string_length.default)(message2);
  if (length > width - 1) {
    return (0, import_ansi_substring.default)(message2, 0, width - 1) + "\u2026";
  }
  return (0, import_ansi_substring.default)(message2, 0, width);
};
var padString = (texts) => {
  const size = Math.max(...texts.map((text2) => (0, import_string_length.default)(text2)));
  return (text2, padding = 0, fill) => {
    return text2.padEnd(size + padding, fill);
  };
};

// src/colors.ts
var import_chalk = __toESM(require("chalk"), 1);
var color = import_chalk.default;

// src/logs.ts
var endMargin = 3;
var intro = (title = "") => {
  (0, import_prompts3.intro)(subString(title, process.stdout.columns - 6 - endMargin));
};
var outro = (title = "") => {
  (0, import_prompts3.outro)(subString(title, process.stdout.columns - 6 - endMargin));
};
var note = (title, message2) => {
  const width = process.stdout.columns - 6 - endMargin;
  (0, import_prompts3.note)(
    wrapString(message2, width, {
      hard: true
    }),
    subString(title, width)
  );
};
var logMessage = (symbol, message2) => {
  import_prompts3.log.message(
    wrapString(message2, process.stdout.columns - 6 - endMargin, {
      hard: true,
      trim: false
    }),
    { symbol }
  );
};
var message = (message2, symbol = color.gray("\u2502")) => logMessage(symbol, message2);
var error2 = (message2) => logMessage(color.red(error), message2);
var info2 = (message2) => logMessage(color.blue(info), message2);
var step2 = (message2) => logMessage(color.green(step), message2);
var warning2 = (message2) => logMessage(color.yellow(warning), message2);
var success2 = (message2) => logMessage(color.green(success), message2);
var list = (title, data) => {
  const padName = padString(Object.keys(data));
  note(
    title,
    Object.entries(data).map(([name, value]) => {
      return color.reset.whiteBright.bold(padName(name + ":", 2)) + value;
    }).join("\n")
  );
};
var task = async (opts) => {
  let last;
  const spin = (0, import_prompts3.spinner)();
  spin.start(opts.initialMessage);
  const stop = (message2, code) => {
    spin.stop(subString(message2 ?? last ?? opts.initialMessage, process.stdout.columns - 6 - endMargin), code);
  };
  try {
    const result = await opts.task((m) => {
      spin.message(subString(m, process.stdout.columns - 6 - endMargin));
      last = m;
    });
    stop(opts.successMessage);
    return result;
  } catch (error3) {
    stop(opts.errorMessage, 2);
    throw error3;
  }
};
var table = (props) => {
  import_prompts3.log.message();
  const length = Math.max(props.head.length, ...props.body.map((b) => b.length));
  const padding = 2;
  const totalPadding = padding * 2 * length;
  const border = 1;
  const totalBorder = (length - 1) * border + 2;
  const windowSize = process.stdout.columns;
  const max = windowSize - totalPadding - totalBorder - endMargin;
  const contentSizes = Array.from({ length }).map((_, i) => {
    return Math.max((0, import_string_length.default)(props.head[i] ?? ""), ...props.body.map((b) => (0, import_string_length.default)(String(b[i]))));
  });
  const columnSizes = Array.from({ length }).map(() => {
    return 0;
  });
  let leftover = Math.min(
    max,
    contentSizes.reduce((total, size) => total + size, 0)
  );
  while (leftover > 0) {
    for (const x in columnSizes) {
      const columnSize = columnSizes[x];
      const contentSize = contentSizes[x];
      if (leftover > 0 && columnSize < contentSize) {
        leftover--;
        columnSizes[x] = columnSize + 1;
      }
    }
  }
  const table2 = new import_cli_table3.default({
    head: props.head.map(
      (value, x) => "\n" + color.reset.whiteBright.bold(
        wrapString(value, columnSizes[x], {
          hard: true
        })
      )
    ),
    style: {
      "padding-left": padding,
      "padding-right": padding
    },
    chars: {
      "bottom-right": "\u256F",
      "top-right": "\u256E",
      "top-left": "\u251C",
      "bottom-left": "\u251C"
    }
  });
  table2.push(
    ...props.body.map((row) => {
      return row.map((value, x) => {
        if (typeof value === "boolean") {
          return value ? color.green("yes") : color.red("no");
        }
        if (typeof value === "number") {
          return color.blue(value);
        }
        return wrapString(value, columnSizes[x], {
          hard: true
        });
      });
    })
  );
  console.log(table2.toString());
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Cancelled,
  ansi,
  color,
  log,
  prompt,
  symbol
});
