import { KeyPressEvent } from "../../deps.ts";
import { genHint, HintAction, s } from "../utils.ts";
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
    readonly nullable = nullable;
    readonly defaultValue = defaultValue;
    protected _value = defaultValue;
    protected displayValue = s(defaultValue);

    hint() {
      const hintActions: HintAction[] = [
        ["right|left|space|return", "toggle"],
        ["d", "default"],
      ];

      if (this.nullable) {
        hintActions.push(["n", "null"]);
      }

      return [genHint(...hintActions), false] as [string, boolean];
    }

    handleInput(event: KeyPressEvent) {
      switch (event.key) {
        case "right":
        case "left":
        case "space":
        case "return":
          this.displayValue = s(this._value = !this._value);
          break;

        case "d":
          this.default();
          break;

        case "n":
          this.null();
          break;

        default:
          return false;
      }

      return true;
    }

    default() {
      this.displayValue = s(this._value = this.defaultValue);
    }

    protected setNull() {
      this.displayValue = s(this._value = null);
    }
  };
}
