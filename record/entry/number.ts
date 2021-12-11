import { KeyPressEvent } from "../deps.ts";
import { genHint, HintAction, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { Entry, EntryConstructor } from "./entry.ts";

export interface NumberEntryOptions {
  float?: boolean;
  min?: number;
  max?: number;
}

export function NumberEntry(
  defaultValue: number,
  options?: NumberEntryOptions,
  nullable?: false,
): EntryConstructor<number>;

export function NumberEntry(
  defaultValue: number | null,
  options: NumberEntryOptions,
  nullable: true,
): EntryConstructor<number | null>;

export function NumberEntry(
  defaultValue: null,
  options?: NumberEntryOptions,
  nullable?: true,
): EntryConstructor<number | null>;

export function NumberEntry(
  defaultValue: number | null,
  options: NumberEntryOptions = {},
  nullable = defaultValue === null,
): EntryConstructor<number | null> {
  const { float = false, min = -Infinity, max = Infinity } = options;

  if (defaultValue !== null && (defaultValue < min || defaultValue > max)) {
    throw new Error(
      `defaultValue is not between min and max: ${min} <= ${defaultValue} <= ${max}`,
    );
  }

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

      const value = this.getBufferValue();

      if (value !== null && !this.buffer.endsWith("Infinity")) {
        if (value < max) {
          hintActions.push(["right", "increment"]);
        }

        if (value > min) {
          hintActions.push(["left", "decrement"]);
        }
      }

      if (max >= Infinity && this.buffer !== "Infinity") {
        hintActions.push(["i", "Infinity"]);
      }

      if (min <= -Infinity && this.buffer !== "-Infinity") {
        hintActions.push(["I", "-Infinity"]);
      }

      if (value !== null && value !== 0) {
        const newValue = value * -1;
        if (newValue >= min && newValue <= max) {
          hintActions.push(["-|+", "toggle sign"]);
        }
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
            if (event.shiftKey) {
              if (min <= -Infinity && this.buffer !== "-Infinity") {
                this.buffer = "-Infinity";
              }
            } else {
              if (max >= Infinity && this.buffer !== "Infinity") {
                this.buffer = "Infinity";
              }
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
            if (this.buffer !== "null" && !this.buffer.endsWith("Infinity")) {
              const value = this.getBufferValue()!;
              if (value < max) {
                this.buffer = s(value + 1);
              }
            }
            break;

          case "left":
            if (this.buffer !== "null" && !this.buffer.endsWith("Infinity")) {
              const value = this.getBufferValue()!;
              if (value > min) {
                this.buffer = s(value - 1);
              }
            }
            break;

          default:
            if (
              event.sequence && /\d/.test(event.sequence) ||
              (float && event.sequence === "." && !this.buffer.includes("."))
            ) {
              let newBuffer = this.buffer;

              if (newBuffer.endsWith("Infinity") || newBuffer === "null") {
                newBuffer = "";
              }

              newBuffer += event.sequence;

              const newValue = this.getBufferValue(newBuffer);
              if (newValue === null || newValue >= min && newValue <= max) {
                this.buffer = newBuffer;
              }
            } else if (
              (event.sequence === "-" || event.sequence === "+")
            ) {
              if (event.sequence === "-" && this.buffer === "" && min < 0) {
                this.buffer += "-";
              } else {
                const value = this.getBufferValue();
                if (value !== null && value !== 0) {
                  const newValue = value * -1;
                  if (newValue >= min && newValue <= max) {
                    this.buffer = s(newValue);
                  }
                }
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
            if (event.shiftKey) {
              if (min <= -Infinity && this._value !== -Infinity) {
                this.setValue(-Infinity);
              }
            } else {
              if (max >= Infinity && this._value !== Infinity) {
                this.setValue(Infinity);
              }
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
              this._value !== null &&
              this._value !== Infinity && this._value !== -Infinity &&
              this._value < max
            ) {
              this.setValue(this._value + 1);
            }
            break;

          case "left":
            if (
              this._value !== null &&
              this._value !== Infinity && this._value !== -Infinity &&
              this._value > min
            ) {
              this.setValue(this._value - 1);
            }
            break;

          default:
            if (
              (event.sequence === "-" || event.sequence === "+") &&
              (this._value !== null && this._value !== 0)
            ) {
              const newValue = this._value * -1;
              if (newValue >= min && newValue <= max) {
                this.setValue(newValue);
              }
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

    private getBufferValue(buffer = this.buffer) {
      if (buffer === "" || buffer === "-") {
        return this._value;
      } else if (buffer === "null") {
        return null;
      } else if (buffer === "Infinity") {
        return Infinity;
      } else if (buffer === "-Infinity") {
        return -Infinity;
      } else {
        try {
          return float ? parseFloat(buffer) : parseInt(buffer, 10);
        } catch {
          return this._value;
        }
      }
    }
  };
}
