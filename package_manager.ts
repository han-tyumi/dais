export type PackageManagerCommand = "yarn" | "npm";

export class PackageManager {
  private initCommand = "init";
  private addCommand: string;
  private devFlag: string;

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
        throw new Error(`invalid PackageManagerCommand name: ${command}`);
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
