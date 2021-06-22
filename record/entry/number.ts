import { genHint, s } from "../utils.ts";
import { theme } from "../theme.ts";
import { Entry, ExtendedEntry } from "./entry.ts";

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

export interface NumberEntry extends ExtendedEntry<number | null> {
  setBuffer(value: string): void;
}

export function NumberEntry(defaultValue: number | null, float = false) {
  return Entry<number | null>((getBaseEntry) => {
    let edit = false;

    // TODO: explore extracting out this functionality
    let buffer = s(defaultValue);

    return {
      ...getBaseEntry(defaultValue),

      hint() {
        return [edit ? editHint : nonEditHint, edit];
      },

      setBuffer(value: string) {
        buffer = value;
        this.displayValue = s(value) + (edit ? theme.base("_") : "");
      },

      handleInput(key) {
        let interrupt = false;

        if (edit) {
          interrupt = true;

          switch (key.name) {
            case "return":
              edit = false;
              if (buffer === "") {
                this.setBuffer(s(this.value = 0));
              } else if (buffer === "null") {
                this.setBuffer(s(this.value = null));
              } else if (buffer === "Infinity") {
                this.setBuffer(s(this.value = Infinity));
              } else {
                try {
                  this.setBuffer(s(
                    this.value = float
                      ? parseFloat(buffer)
                      : parseInt(buffer, 10),
                  ));
                } catch {
                  this.setBuffer(s(this.value));
                }
              }
              break;

            case "escape":
              edit = false;
              this.setBuffer(s(this.value));
              break;

            case "backspace":
              this.setBuffer(
                (buffer === "Infinity" ||
                    buffer === "null")
                  ? ""
                  : buffer.slice(0, -1),
              );
              break;

            case "d":
              this.setBuffer(s(this.defaultValue));
              break;

            case "n":
              this.setBuffer("null");
              break;

            case "i":
              this.setBuffer("Infinity");
              break;

            case "l":
              this.setBuffer("");
              break;

            default:
              if (
                key.sequence && /\d/.test(key.sequence) ||
                (float && key.sequence === "." &&
                  !buffer.includes("."))
              ) {
                if (
                  buffer === "Infinity" ||
                  buffer === "null"
                ) {
                  this.setBuffer("");
                }
                this.setBuffer(buffer + key.sequence);
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
              this.setBuffer(s(this.value));
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
        this.setBuffer(s(this.value = this.defaultValue));
      },

      null() {
        this.setBuffer(s(this.value = null));
      },
    } as NumberEntry;
  });
}
