import { KeyCode } from "../../deps.ts";
import { s } from "../utils.ts";
import { theme } from "../theme.ts";

export interface FormatOptions {
  indentSize: number;
  indentLevel: number;
  maxFieldLen: number;
}

export type EntryValue = boolean | number | string | null;

export interface BaseEntry<T extends EntryValue> {
  __type: "entry";
  key: string;
  defaultValue: T;
  value: T;
  displayKey: string;
  displayValue: string;
  theme: typeof theme;
  toString(): string;
}

export interface ExtendedEntry<T extends EntryValue> extends BaseEntry<T> {
  hint(): [hint: string, interrupt: boolean];
  handleInput(key: KeyCode): boolean;
  default(): void;
  null(): void;
}

export type Entry<T extends EntryValue = EntryValue> = ExtendedEntry<T>;

export type EntryFn<T extends EntryValue = EntryValue> = (
  key: string,
  format: FormatOptions,
) => Entry<T>;

// TODO: support non-nullable Entries (default)

export function Entry<T extends EntryValue>(
  getEntry: (
    getBaseEntry: (defaultValue: T, displayValue?: string) => BaseEntry<T>,
  ) => ExtendedEntry<T>,
): EntryFn<T> {
  return (key, format) => {
    const { indentSize, indentLevel, maxFieldLen } = format;

    const entry = getEntry(
      (defaultValue, displayValue = s(defaultValue)) => ({
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
      }),
    );

    return { ...entry };
  };
}

export function isEntry(value: unknown): value is Entry {
  return (value as Entry).__type === "entry";
}
