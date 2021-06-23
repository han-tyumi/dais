import { colors, KeyPressEvent } from "../../deps.ts";
import { genHint, q, s } from "../utils.ts";
import { Entry } from "./entry.ts";

export type Value = string | null;

export function ChoiceEntry(choices: string[], defaultValue: Value) {
  return class ChoiceEntry extends Entry<Value> {
    protected static hint = genHint(
      ["right|space|return", "next"],
      ["left", "prev"],
      ["d", "default"],
      ["n", "null"],
    );

    readonly defaultValue = defaultValue;
    value = defaultValue;
    protected displayValue = q(defaultValue);

    protected defaultIndex = defaultValue !== null
      ? choices.indexOf(defaultValue)
      : -1;
    protected index = this.defaultIndex;

    hint() {
      return [
        colors.cyan(`choices: [${choices.map(q).join(", ")}]\n`) +
        ChoiceEntry.hint,
        false,
      ] as [string, boolean];
    }

    handleInput(event: KeyPressEvent) {
      let interrupt = false;

      switch (event.key) {
        case "right":
        case "space":
        case "return":
          this.index = this.index < choices.length - 1 ? this.index + 1 : 0;
          interrupt = true;
          break;

        case "left":
          this.index = this.index > 0 ? this.index - 1 : choices.length - 1;
          interrupt = true;
          break;

        case "d":
          this.default();
          break;

        case "n":
          this.null();
          break;
      }

      if (interrupt) {
        this.displayValue = q(this.value = choices[this.index]);
      }

      return interrupt;
    }

    default() {
      this.displayValue = q(this.value = this.defaultValue);
      this.index = this.defaultIndex;
    }

    null() {
      this.displayValue = s(this.value = null);
      this.index = -1;
    }
  };
}
