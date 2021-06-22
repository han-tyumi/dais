import { genHint, s } from "../utils.ts";
import { Entry } from "./entry.ts";

const hint = genHint(
  ["right|left|space|return", "toggle"],
  ["d", "default"],
  ["n", "null"],
);

export function BooleanEntry(defaultValue: boolean | null) {
  return Entry<boolean | null>((getBaseEntry) => ({
    ...getBaseEntry(defaultValue),

    hint() {
      return [hint, false];
    },

    handleInput(event) {
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
    },

    default() {
      this.displayValue = s(this.value = this.defaultValue);
    },

    null() {
      this.displayValue = s(this.value = null);
    },
  }));
}
