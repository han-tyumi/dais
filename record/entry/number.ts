import { KeyPressEvent } from "../../deps.ts";
import { genHint, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { Entry } from "./entry.ts";

export type Value = number | null;

export function NumberEntry(defaultValue: Value, float = false) {
  return class NumberEntry extends Entry<Value> {
    protected static hint = {
      edit: genHint(
        ["return", "save"],
        ["esc", "cancel"],
        ["l", "clear"],
        ["i", "Infinity"],
        ["d", "default"],
        ["n", "null"],
      ),
      default: genHint(
        ["return", "edit"],
        ["d", "default"],
        ["n", "null"],
      ),
    };

    readonly defaultValue = defaultValue;
    value = defaultValue;
    protected displayValue = s(defaultValue);

    protected edit = false;

    // TODO: explore extracting out this functionality
    protected _buffer = s(defaultValue);
    protected get buffer() {
      return this._buffer;
    }
    protected set buffer(value) {
      this._buffer = value;
      this.displayValue = s(value) + (this.edit ? theme.base("_") : "");
    }

    hint() {
      return [
        this.edit ? NumberEntry.hint.edit : NumberEntry.hint.default,
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
            if (this.buffer === "") {
              this.buffer = s(this.value = 0);
            } else if (this.buffer === "null") {
              this.buffer = s(this.value = null);
            } else if (this.buffer === "Infinity") {
              this.buffer = s(this.value = Infinity);
            } else {
              try {
                this.buffer = s(
                  this.value = float
                    ? parseFloat(this.buffer)
                    : parseInt(this.buffer, 10),
                );
              } catch {
                this.buffer = s(this.value);
              }
            }
            break;

          case "escape":
            this.edit = false;
            this.buffer = s(this.value);
            break;

          case "backspace":
            this.buffer = (this.buffer === "Infinity" || this.buffer === "null")
              ? ""
              : this.buffer.slice(0, -1);
            break;

          case "d":
            this.buffer = s(this.defaultValue);
            break;

          case "n":
            this.buffer = "null";
            break;

          case "i":
            this.buffer = "Infinity";
            break;

          case "l":
            this.buffer = "";
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
            this.buffer = s(this.value);
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
      this.buffer = s(this.value = this.defaultValue);
    }

    null() {
      this.buffer = s(this.value = null);
    }
  };
}
