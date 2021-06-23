import { KeyPressEvent } from "../../deps.ts";
import { genHint, s } from "../utils.ts";
import { Entry } from "./entry.ts";

export type Value = boolean | null;

export function BooleanEntry(defaultValue: Value) {
  return class BooleanEntry extends Entry<Value> {
    protected static hint = genHint(
      ["right|left|space|return", "toggle"],
      ["d", "default"],
      ["n", "null"],
    );

    readonly defaultValue = defaultValue;
    value = defaultValue;
    protected displayValue = s(defaultValue);

    hint() {
      return [BooleanEntry.hint, false] as [string, boolean];
    }

    handleInput(event: KeyPressEvent) {
      switch (event.key) {
        case "right":
        case "left":
        case "space":
        case "return":
          this.displayValue = s(this.value = !this.value);
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
      this.displayValue = s(this.value = this.defaultValue);
    }

    null() {
      this.displayValue = s(this.value = null);
    }
  };
}
