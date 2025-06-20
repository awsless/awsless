var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
  message: () => message,
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
  padString: () => padString,
  stringLength: () => stringLength,
  subString: () => subString,
  wrapString: () => wrapString
});
import ansiSubstring from "ansi-substring";
import stringLength from "string-length";
import wrapAnsi from "wrap-ansi";
var wrapString = (lines, width, options) => {
  return wrapAnsi(typeof lines === "string" ? lines : lines.join("\n"), width, options);
};
var subString = (message2, width) => {
  const length = stringLength(message2);
  if (length > width - 1) {
    return ansiSubstring(message2, 0, width - 1) + "\u2026";
  }
  return ansiSubstring(message2, 0, width);
};
var padString = (texts) => {
  const size = Math.max(...texts.map((text2) => stringLength(text2)));
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
  p_intro(subString(title, process.stdout.columns - 6 - endMargin));
};
var outro = (title = "") => {
  p_outro(subString(title, process.stdout.columns - 6 - endMargin));
};
var note = (title, message2) => {
  const width = process.stdout.columns - 6 - endMargin;
  p_note(
    wrapString(message2, width, {
      hard: true
    }),
    subString(title, width)
  );
};
var logMessage = (symbol, message2) => {
  log.message(
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
  const spin = spinner();
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
  log.message();
  const length = Math.max(props.head.length, ...props.body.map((b) => b.length));
  const padding = 2;
  const totalPadding = padding * 2 * length;
  const border = 1;
  const totalBorder = (length - 1) * border + 2;
  const windowSize = process.stdout.columns;
  const max = windowSize - totalPadding - totalBorder - endMargin;
  const contentSizes = Array.from({ length }).map((_, i) => {
    return Math.max(stringLength(props.head[i] ?? ""), ...props.body.map((b) => stringLength(String(b[i]))));
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
  const table2 = new Table({
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
export {
  Cancelled,
  ansi_exports as ansi,
  color,
  logs_exports as log,
  prompts_exports as prompt,
  symbols_exports as symbol
};
