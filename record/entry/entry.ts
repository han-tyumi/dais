import { KeyPressEvent } from "../../deps.ts";
import { theme } from "../theme.ts";
import { BooleanEntry } from "./boolean.ts";
import { ChoiceEntry } from "./choice.ts";
import { NumberEntry } from "./number.ts";
import { StringEntry } from "./string.ts";

export type EntryValue = boolean | number | string | null;

export interface FormatOptions {
  indentSize: number;
  indentLevel: number;
  maxFieldLen: number;
}

export interface EntryConstructor {
  new (key: string, format: FormatOptions): Entry;
}

export abstract class Entry<T extends EntryValue = EntryValue> {
  static Boolean = BooleanEntry;
  static Choice = ChoiceEntry;
  static Number = NumberEntry;
  static String = StringEntry;

  abstract readonly defaultValue: T;
  abstract value: T;
  readonly displayKey: string;
  protected abstract displayValue: string;

  protected theme = { ...theme };

  constructor(readonly key: string, readonly format: FormatOptions) {
    const { indentSize, indentLevel, maxFieldLen } = format;

    this.displayKey = theme.key((" ".repeat(indentSize * indentLevel) + key)
      .padEnd(maxFieldLen)) +
      theme.base(" : ");
  }

  abstract hint(): [hint: string, interrupt: boolean];
  abstract handleInput(event: KeyPressEvent): boolean;
  abstract default(): void;
  abstract null(): void;

  toString() {
    return this.displayKey +
      (this.displayValue ? this.theme.value(this.displayValue) : "");
  }
}
