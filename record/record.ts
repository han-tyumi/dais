import { colors, Fuse, keypress, tty } from "./deps.ts";

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
  readonly flatEntries: Entries = [];
  readonly config: Config = {};

  get changed() {
    for (const { changed } of this.entries) {
      if (changed) {
        return true;
      }
    }
    return false;
  }

  private y = 0;
  private rows = 7;
  private buffer = 4;
  private selection = 0;
  private start = 0;
  private windowEntries = this.flatEntries;

  private get atStart() {
    return this.selection === 0;
  }

  private get atEnd() {
    return this.selection === this.windowEntries.length - 1;
  }

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
        this.flatEntries.push(entry);
        this.config[key] = entry;
      } else {
        const record = new Record(value, {
          indentSize,
          indentLevel: indentLevel + 1,
          maxFieldLen,
        }, key);
        this.entries.push(record);
        this.flatEntries.push(record, ...record.flatEntries);
        this.config[key] = record.config;
      }
    }
  }

  // [TODO] split up logic
  // [TODO] display page, selection, and/or total numbers
  async prompt(rows = this.rows) {
    this.rows = rows > this.flatEntries.length ? this.flatEntries.length : rows;
    this.buffer = Math.ceil(this.rows / 2);
    this.selection = 0;
    this.start = 0;
    this.windowEntries = this.flatEntries;

    const fuse = new Fuse(this.flatEntries, {
      keys: [
        { name: "key", weight: 0.5 },
        { name: "displayValue", weight: 0.3 },
        { name: "choices", weight: 0.2 },
      ],
      findAllMatches: true,
    });
    let searching = false;
    let query = "";
    let cancelled = false;

    tty.cursorLeft.eraseDown.cursorHide();

    do {
      if (searching) {
        const results = fuse.search(query);

        this.windowEntries = [];
        const indices = new Set();
        for (const { item, refIndex } of results) {
          this.windowEntries.push(item);
          indices.add(refIndex);
        }

        this.windowEntries.push(
          ...this.flatEntries.filter((_, i) => !indices.has(i)),
        );

        this.write(
          theme.base("/") +
            (query ? colors.magenta(query) : "") +
            theme.base("_\n"),
        );
      } else if (query) {
        this.write(theme.base("/") + colors.magenta.bold(query) + "\n");
      }

      const window = this.windowEntries
        .slice(this.start, this.start + this.rows)
        .map((entry, i) =>
          this.start + i === this.selection
            ? colors.bold.bgBlack(entry.toString())
            : entry
        )
        .join("\n");
      this.write(window);

      if (searching) {
        const hintActions: HintAction[] = [
          ["return", "submit"],
          ["esc", "cancel"],
        ];

        if (query) {
          hintActions.push(["^l", "clear"]);
        }

        this.write("\n" + genHint(hintActions));

        const event = await keypress();

        if (event.key === "return") {
          searching = false;
        } else if (event.key === "escape") {
          searching = false;
          query = "";
          this.windowEntries = this.flatEntries;
        } else if (event.key === "l" && event.ctrlKey) {
          query = "";
        } else if (event.key === "backspace") {
          query = query.slice(0, -1);
        } else if (event.sequence?.length === 1) {
          query += event.sequence;
        }
      } else {
        const selected = this.windowEntries[this.selection];

        let interrupt = false;
        if (selected instanceof Entry) {
          const { hint, interrupt: selectedInterrupt = false } = selected.hint;
          interrupt = selectedInterrupt;
          hint && this.write("\n" + hint);
        }

        if (!interrupt) {
          // [TODO] split up hints on multiple lines
          // [TODO] support optional VIM or custom navigation
          const hintActions: HintAction[] = [
            ["up", "move up"],
            ["down", "move down"],
            ["pgup", "move up a page"],
            ["pgdn", "move down a page"],
          ];

          if (!this.atStart) {
            hintActions.push(["home", "move to start"]);
          }
          if (!this.atEnd) {
            hintActions.push(["end", "move to end"]);
          }

          if (selected.changed) {
            hintActions.push(["d", "default"]);
          }

          if (
            selected instanceof Entry &&
            selected.nullable &&
            selected.value !== null
          ) {
            hintActions.push(["n", "null"]);
          }

          hintActions.push(["/", "search"]);
          if (query) {
            hintActions.push(["?", "clear search"]);
          }

          if (this.changed) {
            hintActions.push(["^d", "all default"]);
          }

          hintActions.push(
            ["^s", "save"],
            // [TODO] change cancel to something else; ctrl+c to quit completely
            // [TODO] allow cancel within edit
            ["^c", "cancel"],
          );

          this.write("\n" + genHint(hintActions));
        }

        const event = await keypress();

        interrupt = selected instanceof Entry
          ? selected.handleInput(event)
          : false;

        if (!interrupt) {
          switch (event.key) {
            case "up":
              this.moveUp();
              break;

            case "pageup":
              this.movePageUp();
              break;

            case "home":
              this.moveToStart();
              break;

            case "down":
              this.moveDown();
              break;

            case "pagedown":
              this.movePageDown();
              break;

            case "end":
              this.moveToEnd();
              break;

            case "d":
              selected.default();
              break;

            case "n":
              if (selected instanceof Entry) {
                selected.null();
              }
              break;
          }

          if (event.sequence === "/") {
            searching = true;
            query = "";
            this.windowEntries = this.flatEntries;
            this.start = this.selection = 0;
          } else if (event.sequence === "?") {
            query = "";
            this.windowEntries = this.flatEntries;
            this.selection = this.windowEntries
              .findIndex(({ key }) => key === selected.key) ||
              this.selection;

            this.start = (this.selection - this.buffer) + 1;
            if (this.start < 0) {
              this.start = 0;
            } else if (this.start > this.windowEntries.length - this.rows) {
              this.start = this.windowEntries.length - this.rows;
            }
          } else if (event.key === "c" && event.ctrlKey) {
            cancelled = true;
            break;
          } else if (event.key === "s" && event.ctrlKey) {
            break;
          } else if (event.key === "d" && event.ctrlKey) {
            this.default();
          }
        }
      }

      this.resetCursor();
    } while (true);

    this.write("\n");
    this.resetCursor();
    tty.cursorShow();

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
        } else {
          values[key] = value.value;
        }
      }
      return values;
    };

    return getValues();
  }

  default() {
    for (const entry of this.entries) {
      entry.default();
    }
  }

  toString() {
    const { indentSize, indentLevel, maxFieldLen } = this.format;
    return this.key === undefined
      ? ""
      : theme.key((" ".repeat(indentSize * (indentLevel - 1)) + this.key)
        .padEnd(maxFieldLen)) +
        theme.base(" :");
  }

  private write(text: string) {
    this.y += colors.stripColor(text).split("\n").length - 1;
    write(text);
  }

  private resetCursor() {
    tty.cursorUp(this.y);
    tty.cursorLeft.eraseDown();
    this.y = 0;
  }

  private moveUp() {
    if (this.atStart) {
      return this.moveToEnd();
    }

    this.selection--;

    if (
      this.start > 0 &&
      this.selection < this.windowEntries.length - this.buffer
    ) {
      this.start--;
    }
  }

  private movePageUp() {
    if (this.atStart) {
      this.moveToEnd();
    }

    if (this.start > 0) {
      this.start = Math.max(this.start - this.rows, 0);
      this.selection = this.start + this.buffer - 1;
    } else if (this.selection > 0) {
      this.selection = 0;
    }
  }

  private moveToStart() {
    if (!this.atStart) {
      this.selection = this.start = 0;
    }
  }

  private moveDown() {
    if (this.atEnd) {
      return this.moveToStart();
    }

    this.selection++;

    if (
      this.start + this.rows < this.windowEntries.length &&
      this.selection >= this.buffer
    ) {
      this.start++;
    }
  }

  private movePageDown() {
    if (this.atEnd) {
      this.moveToStart();
    }

    if (this.start < this.windowEntries.length - this.rows) {
      this.start = Math.min(
        this.start + this.rows,
        this.windowEntries.length - this.rows,
      );
      this.selection = this.start + this.buffer - 1;
    } else if (this.selection < this.windowEntries.length - 1) {
      this.selection = this.windowEntries.length - 1;
    }
  }

  private moveToEnd() {
    if (!this.atEnd) {
      this.selection = this.windowEntries.length - 1;
      this.start = this.windowEntries.length - this.rows;
    }
  }
}
