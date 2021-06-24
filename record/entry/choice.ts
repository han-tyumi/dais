import { colors, KeyPressEvent } from "../../deps.ts";
import { genHint, HintAction, q, s } from "../utils.ts";
import { Entry, EntryConstructor } from "./entry.ts";

export function ChoiceEntry(
  choices: string[],
  defaultValue: string,
  nullable?: false,
): EntryConstructor<string>;

export function ChoiceEntry(
  choices: string[],
  defaultValue: string | null,
  nullable: true,
): EntryConstructor<string | null>;

export function ChoiceEntry(
  choices: string[],
  defaultValue: null,
  nullable?: true,
): EntryConstructor<string | null>;

export function ChoiceEntry(
  choices: string[],
  defaultValue: string | null,
  nullable = defaultValue === null,
): EntryConstructor<string | null> {
  return class ChoiceEntry extends Entry<string | null> {
    readonly choices = choices;
    readonly nullable = nullable;
    readonly defaultValue = defaultValue;
    protected _value = defaultValue;
    protected displayValue = q(defaultValue);

    protected defaultIndex = defaultValue !== null
      ? choices.indexOf(defaultValue)
      : -1;
    protected index = this.defaultIndex;

    hint() {
      const hintActions: HintAction[] = [
        ["right|space|return", "next"],
        ["left", "prev"],
        ["d", "default"],
      ];

      if (this.nullable) {
        hintActions.push(["n", "null"]);
      }

      return [
        colors.cyan(`choices: [${choices.map(q).join(", ")}]\n`) +
        genHint(...hintActions),
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
        this.displayValue = q(this._value = choices[this.index]);
      }

      return interrupt;
    }

    default() {
      this.displayValue = q(this._value = this.defaultValue);
      this.index = this.defaultIndex;
    }

    protected setNull() {
      this.displayValue = s(this._value = null);
      this.index = -1;
    }
  };
}
