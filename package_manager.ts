import { existsSync } from "./deps.ts";
import { commandExists } from "./utils.ts";

export type PackageManagerCommand = "yarn" | "npm";

export class PackageManager {
  private initCommand = "init";
  private addCommand: string;
  private devFlag: string;

  static async init(prefer: PackageManagerCommand = "yarn") {
    if (!await commandExists("node")) {
      throw new Error("node does not exist");
    }

    if (existsSync("package.json")) {
      return new PackageManager(
        existsSync("yarn.lock") ? "yarn" : (existsSync("package-lock.json") ||
            existsSync("npm-shrinkwrap.json"))
          ? "npm"
          : prefer === "yarn" && await commandExists("yarn")
          ? "yarn"
          : "npm",
      );
    }

    const packageManager = new PackageManager(
      prefer === "yarn" && await commandExists("yarn") ? "yarn" : "npm",
    );

    await packageManager.init();
    if (!existsSync("package.json")) {
      throw new Error("package.json not initialized");
    }

    return packageManager;
  }

  constructor(readonly command: PackageManagerCommand = "yarn") {
    switch (command) {
      case "yarn":
        this.addCommand = "add";
        this.devFlag = "--dev";
        break;
      case "npm":
        this.addCommand = "install";
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
