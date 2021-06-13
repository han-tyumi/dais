type StringifyOptions = {
  indentSize: number;
  indentLevel: number;
  quoteStyle: '"' | "'" | "`";
  semi: boolean;
};

function formatObject(obj: Record<string, unknown>, options: StringifyOptions) {
  if (!Object.keys(obj).length) {
    return "{}";
  }

  const { indentSize, indentLevel } = options;
  const spaces = " ".repeat(indentSize * indentLevel);

  let lines = "{\n";
  for (const [key, value] of Object.entries(obj)) {
    const formatted = formatValue(value, options);
    if (formatted !== undefined) {
      lines += `${spaces}${key}: ${formatted},\n`;
    }
  }

  return `${lines}${" ".repeat(indentSize * (indentLevel - 1))}}`;
}

function formatArray(arr: unknown[], options: StringifyOptions) {
  if (!arr.length) {
    return "[]";
  }

  const { indentSize, indentLevel } = options;
  const spaces = " ".repeat(indentSize * indentLevel);

  let lines = "[\n";
  for (const item of arr) {
    const formatted = formatValue(item, options);
    if (formatted !== undefined) {
      lines += `${spaces}${formatted},\n`;
    }
  }

  return `${lines}${" ".repeat(indentSize * (indentLevel - 1))}]`;
}

function escapeString(value: string, options: StringifyOptions) {
  const { quoteStyle } = options;
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\v/g, "\\v")
    .replace(/\f/g, "\\f")
    .replace(/[\b]/g, "\\b")
    .replace(/\0/g, "\\0")
    .replaceAll(quoteStyle, `\\${quoteStyle}`);
}

function formatValue(value: unknown, options: StringifyOptions) {
  const { indentLevel, quoteStyle } = options;

  switch (typeof value) {
    case "undefined":
    case "boolean":
    case "number":
    case "bigint":
      return `${value}`;
    case "string":
      return quoteStyle + escapeString(value, options) + quoteStyle;
    case "object":
      if (!value) {
        return `${value}`;
      } else if (Array.isArray(value)) {
        return formatArray(value, {
          ...options,
          indentLevel: indentLevel + 1,
        });
      } else {
        return formatObject(value as Record<string, unknown>, {
          ...options,
          indentLevel: indentLevel + 1,
        });
      }
    case "function":
    case "symbol":
      return;
  }
}

export function stringify(
  obj: unknown,
  options: Partial<StringifyOptions> = {},
) {
  const { indentSize = 2, indentLevel = 0, quoteStyle = "'", semi = false } =
    options;

  return `module.exports = ${
    formatValue(obj, {
      indentSize,
      indentLevel,
      quoteStyle,
      semi,
    })
  }${semi ? ";" : ""}\n`;
}
