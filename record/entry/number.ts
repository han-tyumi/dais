import { colors, KeyPressEvent } from "../deps.ts";

import { theme } from "../theme.ts";
import { s } from "../utils.ts";

import { ActionMatcher } from "./action/mod.ts";

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
      this.displayValue = value + (this.edit ? theme.base("_") : "");
    }

    protected get editValue() {
      return this.edit ? this.getBufferValue() : this.value;
    }
    protected set editValue(value) {
      this.buffer = s(this.edit ? value : (this._value = value));
    }

    protected actions = ActionMatcher.new({
      hintFormat: (trigger, description) =>
        trigger &&
        description &&
        colors.blue.bold(`[${trigger}] `) + colors.blue(description),
      hintSeparator: colors.white(" | "),
    }).add(
      {
        matcher: "return",
        action: () => {
          if (this.edit) {
            this.edit = false;
            this.editValue = this.getBufferValue();
            this.theme.value = theme.value;
          } else {
            this.edit = true;
            this.editValue = this._value;
            this.theme.value = theme.value.italic;
          }
        },
        hint: {
          description: () => (this.edit ? "save" : "edit"),
        },
      },
      {
        matcher: "escape",
        active: () => this.edit,
        action: () => {
          this.edit = false;
          this.buffer = s(this.value);
          this.theme.value = theme.value;
        },
        hint: {
          description: "cancel",
        },
      },
      {
        matcher: (matches) =>
          matches(/\d/) ||
          (float && !this.buffer.includes(".") && matches(".")),
        active: () => this.edit,
        action: (match) => {
          let newBuffer = this.buffer;

          if (newBuffer.endsWith("Infinity") || newBuffer === "null") {
            newBuffer = "";
          }

          newBuffer += match;

          const newValue = this.getBufferValue(newBuffer);
          if (newValue === null || (newValue >= min && newValue <= max)) {
            this.buffer = newBuffer;
          }
        },
        hint: false,
      },
      {
        matcher: "backspace",
        active: () => this.edit,
        action: () => {
          this.buffer =
            this.buffer.endsWith("Infinity") || this.buffer === "null"
              ? ""
              : this.buffer.slice(0, -1);
        },
        hint: false,
      },
      {
        matcher: "l",
        active: () => this.edit && !!this.buffer,
        action: () => {
          this.buffer = "";
        },
        hint: {
          description: "clear",
        },
      },
      {
        matcher: "i",
        active: () => max >= Infinity && this.editValue !== Infinity,
        action: () => {
          this.editValue = Infinity;
        },
        hint: {
          description: "Infinity",
        },
      },
      {
        matcher: "i",
        modifiers: ["shift"],
        active: () => min <= -Infinity && this.editValue !== -Infinity,
        action: () => {
          this.editValue = -Infinity;
        },
        hint: {
          description: "-Infinity",
        },
      },
      {
        matcher: "d",
        active: () => this.edit && this.buffer !== s(this.defaultValue),
        action: () => {
          this.buffer = s(this.defaultValue);
        },
        hint: {
          description: "default",
        },
      },
      {
        matcher: "n",
        active: () => this.edit && this.nullable && this.buffer !== "null",
        action: () => {
          this.buffer = "null";
        },
        hint: {
          description: "null",
        },
      },
      {
        matcher: "right",
        active: () =>
          this.editValue !== null &&
          this.editValue !== Infinity &&
          this.editValue !== -Infinity &&
          this.editValue < max,
        action: () => {
          this.editValue! += 1;
        },
        hint: {
          description: "increment",
        },
      },
      {
        matcher: "left",
        active: () =>
          this.editValue !== null &&
          this.editValue !== Infinity &&
          this.editValue !== -Infinity &&
          this.editValue > min,
        action: () => {
          this.editValue! -= 1;
        },
        hint: {
          description: "decrement",
        },
      },
      {
        matcher: ["-", "+"],
        action: (match) => {
          if (this.edit && match === "-" && this.buffer === "" && min < 0) {
            this.buffer += "-";
          } else {
            this.editValue = this.getToggleSign();
          }
        },
        hint: {
          show: () => {
            if (this.edit && this.buffer === "") {
              return false;
            }
            return this.editValue !== this.getToggleSign();
          },
          description: "toggle sign",
        },
      },
    );

    get hint() {
      return { hint: this.actions.hint(), interrupt: this.edit };
    }

    handleInput(event: KeyPressEvent) {
      const interrupt = this.edit;
      this.actions.try(event);
      return interrupt;
    }

    protected setToDefault() {
      this.editValue = this.defaultValue;
    }

    protected setToNull() {
      this.editValue = null;
    }

    protected getToggleSign() {
      const currentValue = this.editValue;

      if (currentValue) {
        const newValue = currentValue * -1;
        if (newValue >= min && newValue <= max) {
          return newValue;
        }
      }

      return currentValue;
    }

    protected getBufferValue(buffer = this.buffer) {
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
