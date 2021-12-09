import { KeyPressEvent } from "../deps.ts";
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
      } else {
        hintActions.push(["return", "edit"]);
      }

      if (!this.buffer.endsWith("Infinity")) {
        hintActions.push(["right", "increment"], ["left", "decrement"]);
      }

      if (this.buffer !== "Infinity") {
        hintActions.push(["i", "Infinity"]);
      }

      if (
        this.buffer === "" || (this.buffer !== "null" && !this.isBufferZero())
      ) {
        hintActions.push(["-|+", "toggle sign"]);
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
            this.setValue(this.getBufferValue());
            break;

          case "escape":
            this.edit = false;
            this.buffer = s(this._value);
            break;

          case "backspace":
            this.buffer =
              (this.buffer.endsWith("Infinity") || this.buffer === "null")
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

          case "right":
            if (!this.buffer.endsWith("Infinity")) {
              const value = this.getBufferValue();
              if (typeof value === "number") {
                this.buffer = s(value + 1);
              } else {
                this.buffer = "0";
              }
            }
            break;

          case "left":
            if (!this.buffer.endsWith("Infinity")) {
              const value = this.getBufferValue();
              if (typeof value === "number") {
                this.buffer = s(value - 1);
              } else {
                this.buffer = "0";
              }
            }
            break;

          default:
            if (
              event.sequence && /\d/.test(event.sequence) ||
              (float && event.sequence === "." && !this.buffer.includes("."))
            ) {
              if (this.buffer.endsWith("Infinity") || this.buffer === "null") {
                this.buffer = "";
              }
              this.buffer += event.sequence;
            } else if (
              (event.sequence === "-" || event.sequence === "+") &&
              (this.buffer === "" ||
                (this.buffer !== "null" && !this.isBufferZero()))
            ) {
              if (this.buffer[0] === "-") {
                this.buffer = this.buffer.slice(1);
              } else {
                this.buffer = "-" + this.buffer;
              }
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
            break;

          case "i":
            if (this._value !== Infinity) {
              this.setValue(Infinity);
            }
            break;

          case "d":
            if (this._value !== this.defaultValue) {
              this.setValue(this.defaultValue);
            }
            break;

          case "n":
            if (this.nullable && this._value !== null) {
              this.setValue(null);
            }
            break;

          case "right":
            if (
              typeof this._value === "number" &&
              this._value !== Infinity && this._value !== -Infinity
            ) {
              this.setValue(this._value + 1);
            } else {
              this.setValue(0);
            }
            break;

          case "left":
            if (
              typeof this._value === "number" &&
              this._value !== Infinity && this._value !== -Infinity
            ) {
              this.setValue(this._value - 1);
            } else {
              this.setValue(0);
            }
            break;

          default:
            if (
              (event.sequence === "-" || event.sequence === "+") &&
              (this._value !== null && this._value !== 0)
            ) {
              this.setValue(this._value * -1);
            }
        }
      }

      return interrupt;
    }

    protected setToDefault() {
      this.setValue(this.defaultValue);
    }

    protected setToNull() {
      this.setValue(null);
    }

    private setValue(value: number | null) {
      this.buffer = s(this._value = value);
    }

    private getBufferValue() {
      if (this.buffer === "" || this.buffer === "-") {
        return 0;
      } else if (this.buffer === "null") {
        return null;
      } else if (this.buffer === "Infinity") {
        return Infinity;
      } else if (this.buffer === "-Infinity") {
        return -Infinity;
      } else {
        try {
          return float ? parseFloat(this.buffer) : parseInt(this.buffer, 10);
        } catch {
          return this._value;
        }
      }
    }

    private isBufferZero() {
      for (const char of this.buffer) {
        if (char !== "-" && char !== "0") {
          return false;
        }
      }
      return true;
    }
  };
}
