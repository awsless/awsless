import { ConfirmOptions, MultiSelectOptions, PasswordOptions, SelectOptions, TextOptions } from "@clack/prompts";
import { Options } from "wrap-ansi";
declare namespace symbols_d_exports {
  export { ellipsis, error$1 as error, info$1 as info, message$1 as message, step$1 as step, success$1 as success, warning$1 as warning };
}
declare const message$1 = "│";
declare const step$1 = "◇";
declare const error$1 = "×";
declare const success$1 = "◆";
declare const warning$1 = "▲";
declare const info$1 = "·";
declare const ellipsis = "…";
declare namespace prompts_d_exports {
  export { confirm, float, integer, multiSelect, password, select, text };
}
declare const text: (opts: TextOptions) => Promise<string>;
declare const password: (opts: PasswordOptions) => Promise<string>;
type NumberOptions = {
  message: string;
  placeholder?: string;
  defaultValue?: number;
  initialValue?: number;
};
declare const integer: (opts: NumberOptions) => Promise<number>;
declare const float: (opts: NumberOptions) => Promise<number>;
declare const confirm: (opts: ConfirmOptions) => Promise<boolean>;
declare const select: <Value>(opts: SelectOptions<Value>) => Promise<Exclude<Value, symbol>>;
declare const multiSelect: <Value>(opts: MultiSelectOptions<Value>) => Promise<Value[]>;
declare namespace logs_d_exports {
  export { error, info, intro, list, message, note, outro, step, success, table, task, warning };
}
declare const intro: (title?: string) => void;
declare const outro: (title?: string) => void;
declare const note: (title: string, message: string) => void;
declare const message: (message: string, symbol?: string) => void;
declare const error: (message: string) => void;
declare const info: (message: string) => void;
declare const step: (message: string) => void;
declare const warning: (message: string) => void;
declare const success: (message: string) => void;
declare const list: (title: string, data: Record<string, string>) => void;
type TaskOptions<T> = {
  initialMessage: string;
  errorMessage?: string;
  successMessage?: string;
  task: (context: {
    updateMessage: (message: string) => void;
    updateErrorMessage: (message: string) => void;
    updateSuccessMessage: (message: string) => void;
  }) => Promise<T>;
};
declare const task: <T>(opts: TaskOptions<T>) => Promise<T>;
declare const table: (props: {
  head: string[];
  body: (string | number | boolean)[][];
}) => void;
declare namespace ansi_d_exports {
  export { length, pad, truncate, wrap };
}
declare const wrap: (value: string, width: number, options?: Options) => string;
declare const length: (value: string) => number;
declare const truncate: (value: string, width: number) => string;
declare const pad: (texts: string[]) => (text: string, padding?: number, fill?: string) => string;
//#endregion
//#region src/colors.d.ts
declare const color: import("chalk").ChalkInstance;
//#endregion
//#region src/error.d.ts
declare class Cancelled extends Error {
  constructor();
}
//#endregion
export { Cancelled, ansi_d_exports as ansi, color, logs_d_exports as log, prompts_d_exports as prompt, symbols_d_exports as symbol };