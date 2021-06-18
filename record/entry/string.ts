import { colors } from "../../deps.ts";
import { genHint, q, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { BaseEntry, Entry, EntryFn } from "./entry.ts";

const editHint = genHint(
  ["ctrl+l", "clear"],
  ["return", "save"],
  ["esc", "cancel"],
  ["ctrl+d", "default"],
  ["ctrl+n", "null"],
);
const nonEditHint = genHint(
  ["return", "edit"],
  ["d", "default"],
  ["n", "null"],
);

interface StringEntry extends Entry<string> {
  _buffer: string | null;
  get buffer(): this["_buffer"];
  set buffer(value);
}

export function StringEntry(defaultValue: string | null): EntryFn<string> {
  return (key, format) => {
    let edit = false;

    return {
      ...BaseEntry({
        key,
        defaultValue,
        displayValue: q(defaultValue),
        format,
      }),

      hint() {
        return [edit ? editHint : nonEditHint, edit];
      },

      _buffer: defaultValue,
      get buffer() {
        return this._buffer;
      },
      set buffer(value) {
        this._buffer = value;
        this.displayValue = value === null
          ? s(value)
          : q(value.replaceAll("'", "\\'") + (edit ? colors.reset("_") : ""));
      },

      handleInput(key) {
        let interrupt = false;

        if (edit) {
          interrupt = true;

          switch (key.name) {
            case "return":
              edit = false;
              this.value = this.buffer;
              this.buffer = this.value;
              break;
            case "escape":
              edit = false;
              this.buffer = this.value;
              break;

            case "backspace":
              this.buffer = this.buffer === null
                ? ""
                : this.buffer.slice(0, -1);
              break;

            default:
              if (key.name === "l" && key.ctrl) {
                this.buffer = "";
              } else if (key.name === "d" && key.ctrl) {
                this.buffer = this.defaultValue;
              } else if (key.name === "n" && key.ctrl) {
                this.buffer = null;
              } else if (key.sequence?.length === 1) {
                if (this.buffer === null) {
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
              this.buffer = this.value;
              this.theme.value = theme.value.italic;
              break;

            case "d":
              this.buffer = this.value = this.defaultValue;
              break;

            case "n":
              this.buffer = this.value = null;
              break;
          }
        }

        return interrupt;
      },
    } as StringEntry;
  };
}
