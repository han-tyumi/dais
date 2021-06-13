import { Confirm, Input, Number, Select } from "./deps.ts";
import { camelToStartCase } from "./utils.ts";

type MultiValue = { options: string[]; default: string };
type Value =
  | boolean
  | string
  | number
  | MultiValue;
type DefaultConfiguration = { [field: string]: Value | DefaultConfiguration };

function isMultiValue(value: unknown): value is MultiValue {
  return Array.isArray((value as MultiValue).options);
}

async function getValue(field: string, value: Value | DefaultConfiguration) {
  const message = `${camelToStartCase(field)}?`;
  switch (typeof value) {
    case "boolean": {
      const result = await Confirm.prompt({ message, default: value });
      return [result, result === value] as const;
    }
    case "string": {
      const result = await Input.prompt({ message, default: value });
      return [result, result === value] as const;
    }
    case "number": {
      const result = await Number.prompt({ message, default: value });
      return [result, result === value] as const;
    }
    default: {
      if (isMultiValue(value)) {
        const result = await Select.prompt({
          message,
          options: value.options,
          default: value.default,
        });
        return [result, result === value.default] as const;
      }
      const result = await configure(value);
      return [result, !Object.keys(result).length] as const;
    }
  }
}

export async function configure<T extends DefaultConfiguration>(
  defaultConfiguration: T,
) {
  const config = {} as Record<string, unknown>;

  for (const [field, value] of Object.entries(defaultConfiguration)) {
    const [result, same] = await getValue(field, value);
    if (!same) {
      config[field] = result;
    }
  }

  return config;
}
