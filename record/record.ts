import { colors, Fuse, keypress, tty } from "../deps.ts";
import {
  Entry,
  EntryConstructor,
  EntryValue,
  FormatOptions,
} from "./entry/entry.ts";
import { theme } from "./theme.ts";
import { genHint, HintAction, write } from "./utils.ts";

export interface RecordConfig {
  [key: string]: EntryConstructor | RecordConfig;
}

export type Entries = (Entry | Record)[];
export type Config = { [key: string]: Entry | Config };

interface Values {
  [key: string]: EntryValue | Values;
}

export class Record {
  readonly format: FormatOptions;
  readonly entries: Entries = [];
  readonly config: Config = {};

  constructor(
    readonly recordConfig: RecordConfig,
    format: Partial<FormatOptions> = {},
    readonly key?: string,
  ) {
    const { indentSize = 2, indentLevel = 0 } = format;

    const getMaxKeyLength = (
      r = recordConfig,
      level = indentLevel,
      maxFieldLen = 0,
    ) => {
      for (const [key, value] of Object.entries(r)) {
        let len = key.length + (indentSize * level);

        if (typeof value !== "function") {
          const max = getMaxKeyLength(value, level + 1, maxFieldLen);
          if (max > len) {
            len = max;
          }
        }

        if (len > maxFieldLen) {
          maxFieldLen = len;
        }
      }

      return maxFieldLen;
    };

    const { maxFieldLen = getMaxKeyLength() } = format;

    this.format = { indentSize, indentLevel, maxFieldLen };

    for (const [key, value] of Object.entries(recordConfig)) {
      if (typeof value === "function") {
        const entry = new value(key, this.format);
        this.entries.push(entry);
        this.config[key] = entry;
      } else {
        const record = new Record(value, {
          indentSize,
          indentLevel: indentLevel + 1,
          maxFieldLen,
        }, key);
        this.entries.push(record, ...record.entries);
        this.config[key] = record.config;
      }
    }
  }

  async prompt(rows = 7) {
    rows = rows > this.entries.length ? this.entries.length : rows;
    const buffer = Math.ceil(rows / 2);
    const fuse = new Fuse(this.entries, {
      keys: [
        { name: "key", weight: 0.5 },
        { name: "displayValue", weight: 0.3 },
        { name: "choices", weight: 0.2 },
      ],
      findAllMatches: true,
    });
    let entries = this.entries;
    let searching = false;
    let query = "";
    let selection = 0;
    let start = 0;
    let cancelled = false;

    tty.cursorSave.cursorHide();

    do {
      if (searching) {
        const results = fuse.search(query);

        entries = [];
        const indices = new Set();
        for (const { item, refIndex } of results) {
          entries.push(item);
          indices.add(refIndex);
        }

        entries.push(...this.entries.filter((_, i) => !indices.has(i)));

        write(
          theme.base("/") +
            (query ? colors.magenta(query) : "") +
            theme.base("_\n"),
        );
      } else if (query) {
        write(theme.base("/") + colors.magenta.bold(query) + "\n");
      }

      const window = entries
        .slice(start, start + rows)
        .map((entry, i) =>
          start + i === selection
            ? colors.bold.bgBlack(entry.toString())
            : entry
        )
        .join("\n");
      write(window);

      if (searching) {
        const hintActions: HintAction[] = [
          ["return", "submit"],
          ["esc", "cancel"],
        ];

        if (query) {
          hintActions.push(["^l", "clear"]);
        }

        write("\n" + genHint(hintActions));

        const event = await keypress();

        if (event.key === "return") {
          searching = false;
        } else if (event.key === "escape") {
          searching = false;
          query = "";
          entries = this.entries;
        } else if (event.key === "l" && event.ctrlKey) {
          query = "";
        } else if (event.key === "backspace") {
          query = query.slice(0, -1);
        } else if (event.sequence?.length === 1) {
          query += event.sequence;
        }
      } else {
        const selected = entries[selection];

        let interrupt = false;
        if (selected instanceof Entry) {
          const { hint, interrupt: i = false } = selected.hint;
          interrupt = i;
          write("\n" + hint);
        }

        if (!interrupt) {
          // [TODO] split up hints on multiple lines
          const hintActions: HintAction[] = [
            // [TODO] support pgup, pgdn, home, end
            // [TODO] support VIM style navigation
            ["up", "move up"],
            ["down", "move down"],
          ];

          if (selected instanceof Entry) {
            if (selected.changed) {
              hintActions.push(["d", "default"]);
            }
            if (selected.nullable && selected.value !== null) {
              hintActions.push(["n", "null"]);
            }
          }

          hintActions.push(["/", "search"]);
          if (query) {
            hintActions.push(["?", "clear search"]);
          }

          hintActions.push(
            // [TODO] remove if all at default
            ["^d", "all default"],
            ["^s", "save"],
            // [TODO] allow cancel within edit
            ["^c", "cancel"],
          );

          write("\n" + genHint(hintActions));
        }

        const event = await keypress();

        interrupt = selected instanceof Entry
          ? selected.handleInput(event)
          : false;

        if (!interrupt) {
          switch (event.key) {
            case "up":
              if (selection > 0) {
                selection--;
              }
              if (start > 0 && selection < entries.length - buffer) {
                start--;
              }
              break;

            case "down":
              if (selection < entries.length - 1) {
                selection++;
              }
              if (start + rows < entries.length && selection >= buffer) {
                start++;
              }
              break;

            case "d":
              // [TODO] add default method for Record
              selected instanceof Entry && selected.default();
              break;

            case "n":
              // [TODO] add null method for Record
              selected instanceof Entry && selected.null();
              break;
          }

          if (event.sequence === "/") {
            searching = true;
            query = "";
            entries = this.entries;
            start = selection = 0;
          } else if (event.sequence === "?") {
            query = "";
            entries = this.entries;
            selection = entries.findIndex(({ key }) => key === selected.key) ||
              selection;

            start = (selection - buffer) + 1;
            if (start < 0) {
              start = 0;
            } else if (start > entries.length - rows) {
              start = entries.length - rows;
            }
          } else if (event.key === "c" && event.ctrlKey) {
            cancelled = true;
            break;
          } else if (event.key === "s" && event.ctrlKey) {
            break;
          } else if (event.key === "d" && event.ctrlKey) {
            entries.forEach((entry) =>
              entry instanceof Entry && entry.default()
            );
          }
        }
      }

      tty.cursorRestore.eraseDown();
    } while (true);

    write("\n");
    tty.cursorRestore.eraseDown.cursorShow();

    if (cancelled) {
      return {};
    }

    const getValues = (c = this.config) => {
      const values: Values = {};
      for (const [key, value] of Object.entries(c)) {
        if (!(value instanceof Entry)) {
          const subValues = getValues(value);
          if (Object.keys(subValues).length) {
            values[key] = subValues;
          }
        } else if (value.changed) {
          values[key] = value.value;
        }
      }
      return values;
    };

    return getValues();
  }

  toString() {
    const { indentSize, indentLevel, maxFieldLen } = this.format;
    return this.key === undefined
      ? ""
      : theme.key((" ".repeat(indentSize * (indentLevel - 1)) + this.key)
        .padEnd(maxFieldLen)) +
        theme.base(" :");
  }
}
