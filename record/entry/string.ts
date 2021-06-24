import { KeyPressEvent } from "../../deps.ts";
import { genHint, HintAction, q, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { Entry, EntryConstructor } from "./entry.ts";

export function StringEntry(
  defaultValue: string,
  nullable?: false,
): EntryConstructor<string>;

export function StringEntry(
  defaultValue: string | null,
  nullable: true,
): EntryConstructor<string | null>;

export function StringEntry(
  defaultValue: null,
  nullable?: true,
): EntryConstructor<string | null>;

export function StringEntry(
  defaultValue: string | null,
  nullable = defaultValue === null,
): EntryConstructor<string | null> {
  return class StringEntry extends Entry<string | null> {
    readonly nullable = nullable;
    readonly defaultValue = defaultValue;
    protected _value = defaultValue;
    protected displayValue = q(defaultValue);

    protected edit = false;

    // [TODO] explore extracting out this functionality
    protected _buffer = defaultValue;
    protected get buffer() {
      return this._buffer;
    }
    protected set buffer(value) {
      this._buffer = value;
      this.displayValue = value === null
        ? s(value)
        : q(value.replaceAll("'", "\\'") + (this.edit ? theme.base("_") : ""));
    }

    hint() {
      const hintActions: HintAction[] = [];

      if (this.edit) {
        hintActions.push(
          ["return", "save"],
          ["esc", "cancel"],
          ["^l", "clear"],
          ["^d", "default"],
        );
        if (this.nullable) {
          hintActions.push(["^n", "null"]);
        }
      } else {
        hintActions.push(
          ["return", "edit"],
          ["d", "default"],
        );
        if (this.nullable) {
          hintActions.push(["n", "null"]);
        }
      }

      return [genHint(...hintActions), this.edit] as [string, boolean];
    }

    handleInput(event: KeyPressEvent) {
      let interrupt = false;

      if (this.edit) {
        interrupt = true;

        switch (event.key) {
          case "return":
            this.edit = false;
            this._value = this.buffer;
            this.buffer = this._value;
            break;
          case "escape":
            this.edit = false;
            this.buffer = this._value;
            break;

          case "backspace":
            this.buffer = this.buffer === null ? "" : this.buffer.slice(0, -1);
            break;

          default:
            if (event.key === "l" && event.ctrlKey) {
              this.buffer = "";
            } else if (event.key === "d" && event.ctrlKey) {
              this.buffer = this.defaultValue;
            } else if (event.key === "n" && event.ctrlKey) {
              this.null();
            } else if (event.sequence?.length === 1) {
              if (this.buffer === null) {
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
            this.buffer = this._value;
            this.theme.value = theme.value.italic;
            break;

          case "d":
            this.default();
            break;

          case "n":
            this.null();
            break;
        }
      }

      return interrupt;
    }

    default() {
      this.buffer = this._value = this.defaultValue;
    }

    protected setNull() {
      this.buffer = null;
      if (!this.edit) {
        this._value = null;
      }
    }
  };
}
