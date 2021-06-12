import { Command, Confirm, EnumType, Select } from "./deps.ts";
import {
  ActionCheckboxOption,
  actionCheckboxPrompt,
} from "./action-checkbox.ts";
import { PackageManager } from "./package_manager.ts";
import { getConfigurationWriter } from "./utils.ts";
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
    const { npm } = options;
    const packageManager = await PackageManager.init(npm ? "npm" : "yarn");

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

      esLintConfig = { root: true };
      const languageConfigs = ["eslint:recommended"];
      const frameworkConfigs: string[] = [];
      const finalConfigs: string[] = [];
      const additionalConfigOptions: ActionCheckboxOption[] = [
        {
          value: "Unicorn",
          action: () => {
            devPackages.push("eslint-plugin-unicorn");
            languageConfigs.push("plugin:unicorn/recommended");
          },
        },
        {
          value: "Imports",
          action: () => {
            devPackages.push("eslint-plugin-import");
            languageConfigs.push("plugin:import/recommended");
            if (typescript) {
              languageConfigs.push("plugin:import/typescript");
            }
          },
        },
      ];

      if (typescript) {
        devPackages.push(
          "@typescript-eslint/parser",
          "@typescript-eslint/eslint-plugin",
        );
        languageConfigs.push("plugin:@typescript-eslint/recommended");
        esLintConfig.parser = "@typescript-eslint/parser";
        esLintConfig.plugins = ["@typescript-eslint"];
      }

      switch (framework) {
        case "react":
          devPackages.push("eslint-plugin-react", "eslint-plugin-react-hooks");
          frameworkConfigs.push(
            "plugin:react/recommended",
            "plugin:react-hooks/recommended",
          );
          additionalConfigOptions.push({
            value: "React A11y",
            action: () => {
              devPackages.push("eslint-plugin-jsx-a11y");
              frameworkConfigs.push("plugin:jsx-a11y/recommended");
            },
          });
          break;
      }

      await actionCheckboxPrompt({
        message: "Additional Rules",
        options: additionalConfigOptions,
      });

      if (prettier) {
        devPackages.push("eslint-config-prettier");
        finalConfigs.push("prettier");
      }

      esLintConfig.extends = [
        ...languageConfigs,
        ...frameworkConfigs,
        ...finalConfigs,
      ];
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
