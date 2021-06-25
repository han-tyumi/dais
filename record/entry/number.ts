import { KeyPressEvent } from "../../deps.ts";
import { genHint, HintAction, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { Entry, EntryConstructor } from "./entry.ts";

export function NumberEntry(
  defaultValue: number,
  float?: boolean,
  nullable?: false,
): EntryConstructor<number>;

export function NumberEntry(
  defaultValue: number | null,
  float: boolean,
  nullable: true,
): EntryConstructor<number | null>;

export function NumberEntry(
  defaultValue: null,
  float?: boolean,
  nullable?: true,
): EntryConstructor<number | null>;

export function NumberEntry(
  defaultValue: number | null,
  float = false,
  nullable = defaultValue === null,
): EntryConstructor<number | null> {
  return class NumberEntry extends Entry<number | null> {
    readonly nullable = nullable;
    readonly defaultValue = defaultValue;
    protected _value = defaultValue;
    protected displayValue = s(defaultValue);

    protected edit = false;

    // [TODO] explore extracting out this functionality
    protected _buffer = s(defaultValue);
    protected get buffer() {
      return this._buffer;
    }
    protected set buffer(value) {
      this._buffer = value;
      this.displayValue = s(value) + (this.edit ? theme.base("_") : "");
    }

    get hint() {
      const hintActions: HintAction[] = [];

      if (this.edit) {
        hintActions.push(
          ["return", "save"],
          ["esc", "cancel"],
        );
        if (this.buffer) {
          hintActions.push(["l", "clear"]);
        }
        if (this.buffer !== "Infinity") {
          hintActions.push(["i", "Infinity"]);
        }
        if (this.buffer !== s(this.defaultValue)) {
          hintActions.push(["d", "default"]);
        }
        if (this.nullable && this.buffer !== "null") {
          hintActions.push(["n", "null"]);
        }
      } else {
        hintActions.push(["return", "edit"]);
      }

      return { hint: genHint(hintActions), interrupt: this.edit };
    }

    handleInput(event: KeyPressEvent) {
      let interrupt = false;

      if (this.edit) {
        interrupt = true;

        switch (event.key) {
          case "return":
            this.edit = false;
            if (this.buffer === "") {
              this.buffer = s(this._value = 0);
            } else if (this.buffer === "null") {
              this.buffer = s(this._value = null);
            } else if (this.buffer === "Infinity") {
              this.buffer = s(this._value = Infinity);
            } else {
              try {
                this.buffer = s(
                  this._value = float
                    ? parseFloat(this.buffer)
                    : parseInt(this.buffer, 10),
                );
              } catch {
                this.buffer = s(this._value);
              }
            }
            break;

          case "escape":
            this.edit = false;
            this.buffer = s(this._value);
            break;

          case "backspace":
            this.buffer = (this.buffer === "Infinity" || this.buffer === "null")
              ? ""
              : this.buffer.slice(0, -1);
            break;

          case "l":
            if (this.buffer) {
              this.buffer = "";
            }
            break;

          case "i":
            if (this.buffer !== "Infinity") {
              this.buffer = "Infinity";
            }
            break;

          case "d":
            if (this.buffer !== s(this.defaultValue)) {
              this.buffer = s(this.defaultValue);
            }
            break;

          case "n":
            if (this.nullable && this.buffer !== "null") {
              this.buffer = "null";
            }
            break;

          default:
            if (
              event.sequence && /\d/.test(event.sequence) ||
              (float && event.sequence === "." && !this.buffer.includes("."))
            ) {
              if (this.buffer === "Infinity" || this.buffer === "null") {
                this.buffer = "";
              }
              this.buffer += event.sequence;
            }
            break;
        }

        if (!this.edit) {
          this.theme.value = theme.value;
        }
      } else {
        switch (event.key) {
          case "return":
            this.edit = true;
            this.theme.value = theme.value.italic;
            this.buffer = s(this._value);
            break;
        }
      }

      return interrupt;
    }

    protected setToDefault() {
      this.buffer = s(this._value = this.defaultValue);
    }

    protected setToNull() {
      this.buffer = s(this._value = null);
    }
  };
}
