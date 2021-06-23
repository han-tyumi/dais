import { KeyPressEvent } from "../../deps.ts";
import { genHint, q, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { Entry } from "./entry.ts";

export type Value = string | null;

export function StringEntry(defaultValue: Value) {
  return class StringEntry extends Entry<Value> {
    protected static hint = {
      edit: genHint(
        ["ctrl+l", "clear"],
        ["return", "save"],
        ["esc", "cancel"],
        ["ctrl+d", "default"],
        ["ctrl+n", "null"],
      ),
      default: genHint(
        ["return", "edit"],
        ["d", "default"],
        ["n", "null"],
      ),
    };

    readonly defaultValue = defaultValue;
    value = defaultValue;
    protected displayValue = q(defaultValue);

    protected edit = false;

    // TODO: explore extracting out this functionality
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
      return [
        this.edit ? StringEntry.hint.edit : StringEntry.hint.default,
        this.edit,
      ] as [
        string,
        boolean,
      ];
    }

    handleInput(event: KeyPressEvent) {
      let interrupt = false;

      if (this.edit) {
        interrupt = true;

        switch (event.key) {
          case "return":
            this.edit = false;
            this.value = this.buffer;
            this.buffer = this.value;
            break;
          case "escape":
            this.edit = false;
            this.buffer = this.value;
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
              this.buffer = null;
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
            this.buffer = this.value;
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
      this.buffer = this.value = this.defaultValue;
    }

    null() {
      this.buffer = this.value = null;
    }
  };
}
