import { colors, keypress, tty } from "../deps.ts";
import {
  Entry,
  EntryConstructor,
  EntryValue,
  FormatOptions,
} from "./entry/entry.ts";
import { theme } from "./theme.ts";
import { genHint, write } from "./utils.ts";

export interface RecordConfig {
  [key: string]: EntryConstructor | RecordConfig;
}

export type Entries = (Entry | Record)[];
export type Config = { [key: string]: Entry | Config };

interface Values {
  [key: string]: EntryValue | Values;
}

// TODO: support fuzzy key / value search
export class Record {
  protected static hint = genHint(
    ["up", "move up"],
    ["down", "move down"],
    ["ctrl+d", "all default"],
    ["ctrl+s", "save"],
    ["ctrl+c", "cancel"],
  );

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
    let selection = 0;
    let start = 0;
    let cancelled = false;

    tty.cursorSave.cursorHide();

    do {
      const window = this.entries
        .slice(start, start + rows)
        .map((entry, i) =>
          start + i === selection
            ? colors.bold.bgBlack(entry.toString())
            : entry
        )
        .join("\n");
      write(window);

      const selected = this.entries[selection];

      let interrupt = false;
      if (selected instanceof Entry) {
        const [hint, i] = selected.hint();
        interrupt = i;
        write("\n" + hint);
      }

      if (!interrupt) {
        write("\n" + Record.hint);
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
            if (start > 0 && selection < this.entries.length - buffer) {
              start--;
            }
            break;

          case "down":
            if (selection < this.entries.length - 1) {
              selection++;
            }
            if (start + rows < this.entries.length && selection >= buffer) {
              start++;
            }
            break;
        }

        if (event.key === "c" && event.ctrlKey) {
          cancelled = true;
          break;
        } else if (event.key === "s" && event.ctrlKey) {
          break;
        } else if (event.key === "d" && event.ctrlKey) {
          this.entries.forEach((entry) =>
            entry instanceof Entry && entry.default()
          );
        }
      }

      tty.cursorRestore.eraseDown();
    } while (true);

    write("\n");
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
        } else if (value.value !== value.defaultValue) {
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
