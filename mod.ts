import {
  Checkbox,
  CheckboxOption,
  Command,
  Confirm,
  EnumType,
  existsSync,
  Select,
} from "./deps.ts";
import { commandExists, getConfigurationWriter } from "./utils.ts";
import { PackageManager } from "./package_manager.ts";
import { ESLintConfig } from "./eslint.d.ts";
import { PrettierConfig } from "./prettier.d.ts";

type Framework = "none" | "react";

const frameworkType = new EnumType(["react"]);

type Options = {
  typescript?: true;
  eslint?: true;
  prettier?: true;
  framework?: Framework;
  npm?: true;
  yaml?: true;
};

const cmd = new Command<Options>()
  .name("basecamp")
  .version("0.1.0")
  .description("Adds ESLint and Prettier configurations to your project.")
  .throwErrors()
  .option("--typescript", "Use TypeScript.")
  .option("--eslint", "Use ESLint.")
  .option("--prettier", "Use Prettier.")
  .type("framework", frameworkType)
  .option("--framework <name:framework>", "Use a specific framework.")
  .option("--npm", "Use npm instead of yarn if found.")
  .option("--yaml", "Use YAML instead of JSON for configuration files.")
  .action(async (options) => {
    if (!await commandExists("node")) {
      throw new Error("node is required");
    }

    const { npm } = options;

    let packageManager: PackageManager;
    if (!existsSync("package.json")) {
      packageManager = new PackageManager(
        !npm && await commandExists("yarn") ? "yarn" : "npm",
      );
      await packageManager.init();
      if (!existsSync("package.json")) {
        throw new Error("a package.json is required");
      }
    } else {
      packageManager = new PackageManager(
        existsSync("yarn.lock") ? "yarn" : (existsSync("package-lock.json") ||
            existsSync("npm-shrinkwrap.json"))
          ? "npm"
          : !npm && await commandExists("yarn")
          ? "yarn"
          : "npm",
      );
    }

    const {
      typescript = await Confirm.prompt({
        message: "TypeScript?",
        default: true,
      }),
      eslint = await Confirm.prompt({
        message: "ESLint?",
        default: true,
      }),
      prettier = await Confirm.prompt({
        message: "Prettier?",
        default: true,
      }),
      framework = await Select.prompt({
        message: "Framework?",
        options: [
          { name: "None", value: "none" },
          { name: "React", value: "react" },
        ],
        default: "react",
      }) as Framework,
    } = options;

    const packages: string[] = [];
    const devPackages: string[] = [];

    switch (framework) {
      case "react":
        packages.push("react", "react-dom");
        break;
    }

    if (typescript) {
      devPackages.push("typescript");
    }

    let prettierConfig: PrettierConfig | undefined;
    if (prettier) {
      devPackages.push("prettier");

      prettierConfig = {
        semi: false,
        singleQuote: true,
      };
    }

    let esLintConfig: ESLintConfig | undefined;
    if (eslint) {
      devPackages.push("eslint");

      const shareableConfigs = ["eslint:recommended"];
      const additionalConfigOptions: CheckboxOption[] = [];

      if (typescript) {
        devPackages.push(
          "@typescript-eslint/parser",
          "@typescript-eslint/eslint-plugin",
        );
        shareableConfigs.push("plugin:@typescript-eslint/recommended");
      }

      switch (framework) {
        case "react":
          devPackages.push("eslint-plugin-react", "eslint-plugin-react-hooks");
          shareableConfigs.push("plugin:react/recommended");
          additionalConfigOptions.push(
            { name: "React Hooks", value: "plugin:react-hooks/recommended" },
            { name: "React A11y", value: "plugin:jsx-a11y/recommended" },
          );
          break;
      }

      if (additionalConfigOptions.length) {
        const additionalConfigs = await Checkbox.prompt({
          message: "Additional Rules",
          options: additionalConfigOptions,
        });
        shareableConfigs.push(...additionalConfigs);
      }

      if (prettier) {
        devPackages.push("eslint-config-prettier");
        shareableConfigs.push("prettier");
      }

      esLintConfig = { root: true, extends: shareableConfigs };

      if (typescript) {
        esLintConfig.parser = "@typescript-eslint/parser";
        esLintConfig.plugins = ["@typescript-eslint"];
      }
    }

    await packageManager.add(...packages);
    await packageManager.addDev(...devPackages);

    const { yaml } = options;
    const configurationWriter = getConfigurationWriter(yaml ? "yml" : "json");

    if (prettierConfig) {
      configurationWriter(".prettierrc", prettierConfig);
    }

    if (esLintConfig) {
      configurationWriter(".eslintrc", esLintConfig);
    }
  });

try {
  await cmd.parse();
} catch (error) {
  if (error instanceof Error) {
    console.error(`${error.name}: ${error.message}`);
  } else {
    console.error(error);
  }
  Deno.exit(1);
}
