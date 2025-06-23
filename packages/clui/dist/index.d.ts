import { TextOptions, PasswordOptions, ConfirmOptions, SelectOptions, MultiSelectOptions } from '@clack/prompts';
import { Options } from 'wrap-ansi';
import * as chalk from 'chalk';

declare const message$1 = "\u2502";
declare const step$1 = "\u25C7";
declare const error$1 = "\u00D7";
declare const success$1 = "\u25C6";
declare const warning$1 = "\u25B2";
declare const info$1 = "\u00B7";
declare const ellipsis = "\u2026";

declare const symbols_ellipsis: typeof ellipsis;
declare namespace symbols {
  export { symbols_ellipsis as ellipsis, error$1 as error, info$1 as info, message$1 as message, step$1 as step, success$1 as success, warning$1 as warning };
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

declare const prompts_confirm: typeof confirm;
declare const prompts_float: typeof float;
declare const prompts_integer: typeof integer;
declare const prompts_multiSelect: typeof multiSelect;
declare const prompts_password: typeof password;
declare const prompts_select: typeof select;
declare const prompts_text: typeof text;
declare namespace prompts {
  export { prompts_confirm as confirm, prompts_float as float, prompts_integer as integer, prompts_multiSelect as multiSelect, prompts_password as password, prompts_select as select, prompts_text as text };
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
    task: (updateMessage: (message: string) => void) => Promise<T>;
};
declare const task: <T>(opts: TaskOptions<T>) => Promise<T>;
declare const table: (props: {
    head: string[];
    body: (string | number | boolean)[][];
}) => void;

declare const logs_error: typeof error;
declare const logs_info: typeof info;
declare const logs_intro: typeof intro;
declare const logs_list: typeof list;
declare const logs_message: typeof message;
declare const logs_note: typeof note;
declare const logs_outro: typeof outro;
declare const logs_step: typeof step;
declare const logs_success: typeof success;
declare const logs_table: typeof table;
declare const logs_task: typeof task;
declare const logs_warning: typeof warning;
declare namespace logs {
  export { logs_error as error, logs_info as info, logs_intro as intro, logs_list as list, logs_message as message, logs_note as note, logs_outro as outro, logs_step as step, logs_success as success, logs_table as table, logs_task as task, logs_warning as warning };
}

declare const wrap: (value: string, width: number, options?: Options) => string;
declare const length: (value: string) => number;
declare const truncate: (value: string, width: number) => string;
declare const pad: (texts: string[]) => (text: string, padding?: number, fill?: string) => string;

declare const ansi_length: typeof length;
declare const ansi_pad: typeof pad;
declare const ansi_truncate: typeof truncate;
declare const ansi_wrap: typeof wrap;
declare namespace ansi {
  export { ansi_length as length, ansi_pad as pad, ansi_truncate as truncate, ansi_wrap as wrap };
}

declare const color: chalk.ChalkInstance;

declare class Cancelled extends Error {
    constructor();
}

export { Cancelled, ansi, color, logs as log, prompts as prompt, symbols as symbol };
