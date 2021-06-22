import { colors, keypress, tty } from "../deps.ts";
import {
  Entry,
  EntryFn,
  EntryValue,
  FormatOptions,
  isEntry,
} from "./entry/entry.ts";
import { genHint, write } from "./utils.ts";
import { theme } from "./theme.ts";

const hint = genHint(
  ["up", "move up"],
  ["down", "move down"],
  ["ctrl+d", "all default"],
  ["ctrl+s", "save"],
  ["ctrl+c", "cancel"],
);

interface Values {
  [key: string]: EntryValue | Values;
}

interface RecordConfig {
  [key: string]: EntryFn | RecordConfig;
}

type Entries = (Entry | Record)[];
type Config = { [key: string]: Entry | Config };

interface Record {
  entries: Entries;
  config: Config;
  prompt(rows?: number): Promise<Values>;
  toString(): string;
}

// TODO: support fuzzy key / value search
export function Record(
  record: RecordConfig,
  format: Partial<FormatOptions> = {},
  key?: string,
): Record {
  const { indentSize = 2, indentLevel = 0 } = format;

  const getMaxKeyLength = (
    r = record,
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

  const entries: Entries = [];
  const config: Config = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "function") {
      const entry = value(key, { indentSize, indentLevel, maxFieldLen });
      entries.push(entry);
      config[key] = entry;
    } else {
      const record = Record(value, {
        indentSize,
        indentLevel: indentLevel + 1,
        maxFieldLen,
      }, key);
      entries.push(record, ...record.entries);
      config[key] = record.config;
    }
  }

  return {
    entries,
    config,

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
        if (isEntry(selected)) {
          const [hint, i] = selected.hint();
          interrupt = i;
          write("\n" + hint);
        }

        if (!interrupt) {
          write("\n" + hint);
        }

        const event = await keypress();

        interrupt = isEntry(selected) ? selected.handleInput(event) : false;

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
            entries.forEach((entry) => isEntry(entry) && entry.default());
          }
        }

        tty.cursorRestore.eraseDown();
      } while (true);

      write("\n");
      tty.cursorShow();

      if (cancelled) {
        return {};
      }

      const getValues = (c = config) => {
        const values: Values = {};
        for (const [key, value] of Object.entries(c)) {
          if (!isEntry(value)) {
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
    },

    toString() {
      return key === undefined
        ? ""
        : theme.key((" ".repeat(indentSize * (indentLevel - 1)) + key)
          .padEnd(maxFieldLen)) +
          theme.base(" :");
    },
  };
}
