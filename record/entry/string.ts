import { genHint, q, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { Entry, ExtendedEntry } from "./entry.ts";

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

export interface StringEntry extends ExtendedEntry<string | null> {
  setBuffer(value: string | null): void;
}

export function StringEntry(defaultValue: string | null) {
  return Entry<string | null>((getBaseEntry) => {
    let edit = false;
    let buffer = defaultValue;

    return {
      ...getBaseEntry(defaultValue, q(defaultValue)),

      hint() {
        return [edit ? editHint : nonEditHint, edit];
      },

      setBuffer(value: string | null) {
        buffer = value;
        this.displayValue = value === null
          ? s(value)
          : q(value.replaceAll("'", "\\'") + (edit ? theme.base("_") : ""));
      },

      handleInput(event) {
        let interrupt = false;

        if (edit) {
          interrupt = true;

          switch (event.key) {
            case "return":
              edit = false;
              this.value = buffer;
              this.setBuffer(this.value);
              break;
            case "escape":
              edit = false;
              this.setBuffer(this.value);
              break;

            case "backspace":
              this.setBuffer(buffer === null ? "" : buffer.slice(0, -1));
              break;

            default:
              if (event.key === "l" && event.ctrlKey) {
                this.setBuffer("");
              } else if (event.key === "d" && event.ctrlKey) {
                this.setBuffer(this.defaultValue);
              } else if (event.key === "n" && event.ctrlKey) {
                this.setBuffer(null);
              } else if (event.sequence?.length === 1) {
                if (buffer === null) {
                  this.setBuffer("");
                }
                this.setBuffer(buffer + event.sequence);
              }
              break;
          }

          if (!edit) {
            this.theme.value = theme.value;
          }
        } else {
          switch (event.key) {
            case "return":
              edit = true;
              this.setBuffer(this.value);
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
      },

      default() {
        this.setBuffer(this.value = this.defaultValue);
      },

      null() {
        this.setBuffer(this.value = null);
      },
    } as StringEntry;
  });
}
