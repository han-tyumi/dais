import { KeyCode } from "../../deps.ts";
import { s } from "../utils.ts";
import { theme } from "../theme.ts";

export interface FormatOptions {
  indentSize: number;
  indentLevel: number;
  maxFieldLen: number;
}

export interface BaseEntryOptions<T> {
  key: string;
  defaultValue: T | null;
  displayValue?: string;
  format: FormatOptions;
}

export interface BaseEntry<T, V = T | null> {
  __type: "entry";
  key: string;
  defaultValue: V;
  value: V;
  displayKey: string;
  displayValue: string;
  theme: typeof theme;
  toString(): string;
}

// TODO: support non-nullable Entries (default)
// TODO: try to refactor so it's not needed to spread this for Entries

export function BaseEntry<T>(options: BaseEntryOptions<T>): BaseEntry<T> {
  const {
    key,
    defaultValue,
    displayValue = s(defaultValue),
    format,
  } = options;
  const { indentSize, indentLevel, maxFieldLen } = format;

  return {
    __type: "entry",
    key,
    defaultValue,
    value: defaultValue,
    displayKey: theme.key((" ".repeat(indentSize * indentLevel) + key)
      .padEnd(maxFieldLen)) +
      theme.base(" : "),
    displayValue,
    theme: { ...theme },

    toString() {
      return this.displayKey +
        (this.displayValue ? this.theme.value(this.displayValue) : "");
    },
  };
}

export type EntryValue = boolean | number | string | null;

export interface Entry<T extends EntryValue = EntryValue> extends BaseEntry<T> {
  hint(): [hint: string, interrupt: boolean];
  handleInput(key: KeyCode): boolean;
  default(): void;
  null(): void;
}

export type EntryFn<T extends EntryValue> = (
  key: string,
  format: FormatOptions,
) => Entry<T>;

export function isEntry(value: unknown): value is Entry {
  return (value as Entry).__type === "entry";
}
