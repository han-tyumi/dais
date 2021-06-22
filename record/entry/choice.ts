import { colors } from "../../deps.ts";
import { genHint, q, s } from "../utils.ts";
import { Entry } from "./entry.ts";

const hint = genHint(
  ["right|space|return", "next"],
  ["left", "prev"],
  ["d", "default"],
  ["n", "null"],
);

export function ChoiceEntry(choices: string[], defaultValue: string | null) {
  return Entry<string | null>((getBaseEntry) => {
    const defaultIndex = defaultValue !== null
      ? choices.indexOf(defaultValue)
      : -1;
    let index = defaultIndex;

    return {
      ...getBaseEntry(defaultValue, q(defaultValue)),

      hint() {
        return [
          colors.cyan(`choices: [${choices.map(q).join(", ")}]\n`) + hint,
          false,
        ];
      },

      handleInput(key) {
        let interrupt = false;

        switch (key.name) {
          case "right":
          case "space":
          case "return":
            index = index < choices.length - 1 ? index + 1 : 0;
            interrupt = true;
            break;

          case "left":
            index = index > 0 ? index - 1 : choices.length - 1;
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
          this.displayValue = q(this.value = choices[index]);
        }

        return interrupt;
      },

      default() {
        this.displayValue = q(this.value = this.defaultValue);
        index = defaultIndex;
      },

      null() {
        this.displayValue = s(this.value = null);
        index = -1;
      },
    };
  });
}
