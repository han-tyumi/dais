import { colors, parse } from "../deps.ts";

export function s(value: unknown) {
  return `${value}`;
}

export function q(value: unknown) {
  return typeof value === "string" ? `'${value}'` : s(value);
}

// TODO: explore creating function to handle inputs that also generates corresponding hints

export type HintAction = [key: string, action: string];

export function genHint(...actions: HintAction[]) {
  return actions.map(([key, action]) =>
    colors.blue(`[${key}] `) + colors.brightBlue(action)
  ).join(colors.blue(" | "));
}

export function keypress() {
  const data = new Uint8Array(8);

  Deno.setRaw(Deno.stdin.rid, true);
  const nread = Deno.stdin.readSync(data);
  Deno.setRaw(Deno.stdin.rid, false);

  if (nread !== null) {
    return parse(data.subarray(0, nread))[0];
  }
}

export function write(text: string) {
  Deno.stdout.writeSync(new TextEncoder().encode(text));
}
