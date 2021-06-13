import { existsSync, Select } from "./deps.ts";
import { commandExists } from "./utils.ts";

export const packageManagerCommands = ["pnpm", "yarn", "npm"] as const;
export type PackageManagerCommand = typeof packageManagerCommands[number];

const foundPackageManagers = await (async () => {
  const results = await Promise.all(packageManagerCommands.map(commandExists));
  return packageManagerCommands.filter((_, i) => results[i]);
})();

export class PackageManager {
  private initCommand = "init";
  private addCommand: string;
  private devFlag: string;

  static async init(command?: PackageManagerCommand) {
    if (!await commandExists("node")) {
      throw new Error("node not found");
    }

    if (!command) {
      if (
        existsSync("package-lock.json") || existsSync("npm-shrinkwrap.json")
      ) {
        command = "npm";
      } else if (existsSync("yarn.lock")) {
        command = "yarn";
      } else if (existsSync("pnpm-lock.yaml")) {
        command = "pnpm";
      } else {
        command = await Select.prompt({
          message: "Package Manager?",
          options: foundPackageManagers,
        }) as PackageManagerCommand;
      }
    }

    if (!foundPackageManagers.includes(command)) {
      throw new Error(`${command} not found`);
    }

    const packageManager = new PackageManager(command);

    if (!existsSync("package.json")) {
      await packageManager.init();
    }

    return packageManager;
  }

  constructor(readonly command: PackageManagerCommand = "yarn") {
    switch (command) {
      case "npm":
        this.addCommand = "install";
        this.devFlag = "--save-dev";
        break;
      case "yarn":
        this.addCommand = "add";
        this.devFlag = "--dev";
        break;
      case "pnpm":
        this.addCommand = "add";
        this.devFlag = "--save-dev";
        break;
      default:
        throw new Error(`invalid command: ${command}`);
    }
  }

  init() {
    return Deno.run({ cmd: [this.command, this.initCommand] }).status();
  }

  async add(...packages: string[]) {
    if (packages.length) {
      return await Deno.run({
        cmd: [this.command, this.addCommand, ...packages],
      }).status();
    }
  }

  async addDev(...packages: string[]) {
    if (packages.length) {
      return await Deno.run({
        cmd: [this.command, this.addCommand, this.devFlag, ...packages],
      }).status();
    }
  }
}
