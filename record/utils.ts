import { colors } from "./deps.ts";

export function s(value: unknown) {
  return `${value}`;
}

export function q(value: unknown) {
  return typeof value === "string" ? `'${value}'` : s(value);
}

// [TODO] explore creating function to handle inputs that also generates corresponding hints

export type HintAction = [key: string, action: string];

export function genHint(actions: HintAction[]) {
  return actions.map(([key, action]) =>
    colors.blue.bold(`[${key}] `) + colors.blue(action)
  ).join(colors.white(" | "));
}

export function write(text: string) {
  Deno.stdout.writeSync(new TextEncoder().encode(text));
}
