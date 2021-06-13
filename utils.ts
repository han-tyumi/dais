import { YAML } from "./deps.ts";
import * as JS from "./js.ts";

export async function commandExists(command: string) {
  const status = await Deno.run({
    cmd: ["command", "-v", command],
    stdout: "null",
    stdin: "null",
  }).status();
  return status.success;
}

export const fileExts = ["json", "yml", "yaml", "js"] as const;

export type FileExt = typeof fileExts[number];
type Config = Record<string, unknown>;

export function getConfigurationWriter(fileExt: FileExt) {
  const stringify = (() => {
    switch (fileExt) {
      case "json":
        return (config: Config) => JSON.stringify(config, null, 2);
      case "yml":
      case "yaml":
        return YAML.stringify;
      case "js":
        return JS.stringify;
    }
  })();

  return (filename: string, config: Config) => {
    Deno.writeTextFileSync(`${filename}.${fileExt}`, stringify(config));
  };
}
