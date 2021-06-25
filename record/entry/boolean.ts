import { KeyPressEvent } from "../../deps.ts";
import { genHint, s } from "../utils.ts";
import { Entry, EntryConstructor } from "./entry.ts";

export function BooleanEntry(
  defaultValue: boolean,
  nullable?: false,
): EntryConstructor<boolean>;

export function BooleanEntry(
  defaultValue: boolean | null,
  nullable: true,
): EntryConstructor<boolean | null>;

export function BooleanEntry(
  defaultValue: null,
  nullable?: true,
): EntryConstructor<boolean | null>;

export function BooleanEntry(
  defaultValue: boolean | null,
  nullable = defaultValue === null,
): EntryConstructor<boolean | null> {
  return class BooleanEntry extends Entry<boolean | null> {
    protected static hint = genHint([["right|left|space|return", "toggle"]]);

    readonly nullable = nullable;
    readonly defaultValue = defaultValue;
    protected _value = defaultValue;
    protected displayValue = s(defaultValue);

    get hint() {
      return { hint: BooleanEntry.hint };
    }

    handleInput(event: KeyPressEvent) {
      switch (event.key) {
        case "right":
        case "left":
        case "space":
        case "return":
          this.displayValue = s(this._value = !this._value);
          break;

        default:
          return false;
      }

      return true;
    }

    protected setToDefault() {
      this.displayValue = s(this._value = this.defaultValue);
    }

    protected setToNull() {
      this.displayValue = s(this._value = null);
    }
  };
}
