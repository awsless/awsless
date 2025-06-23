var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/symbols.ts
var symbols_exports = {};
__export(symbols_exports, {
  ellipsis: () => ellipsis,
  error: () => error,
  info: () => info,
  message: () => message,
  step: () => step,
  success: () => success,
  warning: () => warning
});
var message = "\u2502";
var step = "\u25C7";
var error = "\xD7";
var success = "\u25C6";
var warning = "\u25B2";
var info = "\xB7";
var ellipsis = "\u2026";

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
import {
  confirm as p_confirm,
  multiselect as p_multiselect,
  password as p_password,
  select as p_select,
  text as p_text
} from "@clack/prompts";

// src/error.ts
import { isCancel } from "@clack/prompts";
var Cancelled = class extends Error {
  constructor() {
    super("cancelled");
  }
};
async function wrapPrompt(cb) {
  const result = await cb();
  if (isCancel(result)) {
    throw new Cancelled();
  }
  return result;
}

// src/prompts.ts
var text = async (opts) => {
  return wrapPrompt(() => {
    return p_text(opts);
  });
};
var password = async (opts) => {
  return wrapPrompt(() => {
    return p_password({ mask: "*", ...opts });
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
    return p_confirm(opts);
  });
};
var select = async (opts) => {
  return wrapPrompt(() => {
    return p_select(opts);
  });
};
var multiSelect = async (opts) => {
  return wrapPrompt(() => {
    return p_multiselect(opts);
  });
};

// src/logs.ts
var logs_exports = {};
__export(logs_exports, {
  error: () => error2,
  info: () => info2,
  intro: () => intro,
  list: () => list,
  message: () => message2,
  note: () => note,
  outro: () => outro,
  step: () => step2,
  success: () => success2,
  table: () => table,
  task: () => task,
  warning: () => warning2
});
import { log, intro as p_intro, note as p_note, outro as p_outro, spinner } from "@clack/prompts";
import Table from "cli-table3";

// src/ansi.ts
var ansi_exports = {};
__export(ansi_exports, {
  length: () => length,
  pad: () => pad,
  truncate: () => truncate,
  wrap: () => wrap
});
import ansiTruncate from "ansi-truncate";
import ansiLength from "string-length";
import ansiWrap from "wrap-ansi";
var wrap = (value, width, options) => {
  return ansiWrap(value, width, options);
};
var length = (value) => {
  return ansiLength(value);
};
var truncate = (value, width) => {
  return ansiTruncate(value, width, {
    ellipsis
  });
};
var pad = (texts) => {
  const size = Math.max(...texts.map((text2) => ansiLength(text2)));
  return (text2, padding = 0, fill) => {
    return text2.padEnd(size + padding, fill);
  };
};

// src/colors.ts
import chalk from "chalk";
var color = chalk;

// src/logs.ts
var endMargin = 3;
var intro = (title = "") => {
  p_intro(truncate(title, process.stdout.columns - 6 - endMargin));
};
var outro = (title = "") => {
  p_outro(truncate(title, process.stdout.columns - 6 - endMargin));
};
var note = (title, message3) => {
  const width = process.stdout.columns - 6 - endMargin;
  p_note(
    wrap(message3, width, {
      hard: true
    }),
    truncate(title, width)
  );
};
var logMessage = (symbol, message3) => {
  log.message(
    wrap(message3, process.stdout.columns - 6 - endMargin, {
      hard: true,
      trim: false
    }),
    { symbol }
  );
};
var message2 = (message3, symbol = color.gray(message)) => logMessage(symbol, message3);
var error2 = (message3) => logMessage(color.red(error), message3);
var info2 = (message3) => logMessage(color.blue(info), message3);
var step2 = (message3) => logMessage(color.green(step), message3);
var warning2 = (message3) => logMessage(color.yellow(warning), message3);
var success2 = (message3) => logMessage(color.green(success), message3);
var list = (title, data) => {
  const padName = pad(Object.keys(data));
  note(
    title,
    Object.entries(data).map(([name, value]) => {
      return color.reset.whiteBright.bold(padName(name + ":", 2)) + value;
    }).join("\n")
  );
};
var task = async (opts) => {
  let last;
  const spin = spinner();
  spin.start(opts.initialMessage);
  const stop = (message3, code) => {
    spin.stop(truncate(message3 ?? last ?? opts.initialMessage, process.stdout.columns - 6 - endMargin), code);
  };
  try {
    const result = await opts.task((m) => {
      spin.message(truncate(m, process.stdout.columns - 6 - endMargin));
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
  log.message();
  const length2 = Math.max(props.head.length, ...props.body.map((b) => b.length));
  const padding = 2;
  const totalPadding = padding * 2 * length2;
  const border = 1;
  const totalBorder = (length2 - 1) * border + 2;
  const windowSize = process.stdout.columns;
  const maxTableSize = windowSize - totalPadding - totalBorder - endMargin;
  const contentSizes = Array.from({ length: length2 }).map((_, i) => {
    return Math.max(length(props.head[i] ?? ""), ...props.body.map((b) => length(String(b[i]))));
  });
  const columnSizes = Array.from({ length: length2 }).map(() => {
    return 0;
  });
  let leftover = Math.min(
    maxTableSize,
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
  const table2 = new Table({
    head: props.head.map(
      (value, x) => "\n" + color.reset.whiteBright.bold(
        wrap(value, columnSizes[x], {
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
        return wrap(value, columnSizes[x], {
          hard: true
        });
      });
    })
  );
  console.log(table2.toString());
};
export {
  Cancelled,
  ansi_exports as ansi,
  color,
  logs_exports as log,
  prompts_exports as prompt,
  symbols_exports as symbol
};
