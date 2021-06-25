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

export interface EntryConstructor<T extends EntryValue = EntryValue> {
  new (key: string, format: FormatOptions): Entry<T>;
}

export abstract class Entry<T extends EntryValue = EntryValue> {
  static Boolean = BooleanEntry;
  static Choice = ChoiceEntry;
  static Number = NumberEntry;
  static String = StringEntry;

  abstract readonly nullable: boolean;

  abstract readonly defaultValue: T;
  protected abstract _value: T;
  get value() {
    return this._value;
  }

  get changed() {
    return this._value !== this.defaultValue;
  }

  abstract get hint(): { hint: string; interrupt?: boolean };

  readonly displayKey: string;
  protected abstract displayValue: string;

  protected theme = { ...theme };

  constructor(readonly key: string, readonly format: FormatOptions) {
    const { indentSize, indentLevel, maxFieldLen } = format;

    this.displayKey = theme.key((" ".repeat(indentSize * indentLevel) + key)
      .padEnd(maxFieldLen)) +
      theme.base(" : ");
  }

  abstract handleInput(event: KeyPressEvent): boolean;

  protected abstract setToDefault(): void;
  default() {
    if (this.changed) {
      this.setToDefault();
    }
  }

  protected abstract setToNull(): void;
  null() {
    if (this.nullable && this._value !== null) {
      this.setToNull();
    }
  }

  toString() {
    return this.displayKey +
      (this.displayValue ? this.theme.value(this.displayValue) : "");
  }
}
