import { colors } from "../../deps.ts";
import { genHint, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { BaseEntry, Entry, EntryFn } from "./entry.ts";

const editHint = genHint(
  ["return", "save"],
  ["esc", "cancel"],
  ["l", "clear"],
  ["i", "Infinity"],
  ["d", "default"],
  ["n", "null"],
);
const nonEditHint = genHint(
  ["return", "edit"],
  ["d", "default"],
  ["n", "null"],
);

// TODO: explore extracting out this functionality
interface NumberEntry extends Entry<number> {
  _buffer: string;
  get buffer(): this["_buffer"];
  set buffer(value);
}

export function NumberEntry(
  defaultValue: number | null,
  float = false,
): EntryFn<number> {
  return (key, format) => {
    let edit = false;

    return {
      ...BaseEntry({ key, defaultValue, format }),

      hint() {
        return [edit ? editHint : nonEditHint, edit];
      },

      _buffer: s(defaultValue),
      get buffer() {
        return this._buffer;
      },
      set buffer(value) {
        this._buffer = value;
        this.displayValue = s(value) + (edit ? colors.reset("_") : "");
      },

      handleInput(key) {
        let interrupt = false;

        if (edit) {
          interrupt = true;

          switch (key.name) {
            case "return":
              edit = false;
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
              edit = false;
              this.buffer = s(this.value);
              break;

            case "backspace":
              this.buffer = (this.buffer === "Infinity" ||
                  this.buffer === "null")
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
                key.sequence && /\d/.test(key.sequence) ||
                (float && key.sequence === "." &&
                  !this.buffer.includes("."))
              ) {
                if (
                  this.buffer === "Infinity" ||
                  this.buffer === "null"
                ) {
                  this.buffer = "";
                }
                this.buffer += key.sequence;
              }
              break;
          }

          if (!edit) {
            this.theme.value = theme.value;
          }
        } else {
          switch (key.name) {
            case "return":
              edit = true;
              this.theme.value = theme.value.italic;
              this.buffer = s(this.value);
              break;

            case "d":
              this.buffer = s(this.value = this.defaultValue);
              break;

            case "n":
              this.buffer = s(this.value = null);
              break;
          }
        }

        return interrupt;
      },
    } as NumberEntry;
  };
}
