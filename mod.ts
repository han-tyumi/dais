import { Command, Confirm, EnumType, Select } from "./deps.ts";
import {
  ActionCheckboxOption,
  actionCheckboxPrompt,
} from "./action_checkbox.ts";
import {
  PackageManager,
  PackageManagerCommand,
  packageManagerCommands,
} from "./package_manager.ts";
import { Entry, Record } from "./record/mod.ts";
import { FileExt, fileExts, getConfigurationWriter } from "./utils.ts";
import { ESLintConfig } from "./eslint.d.ts";
import { PrettierConfig } from "./prettier.d.ts";

const frameworks = ["React", "Next"] as const;
const frameworkType = new EnumType(frameworks);

type Framework = typeof frameworks[number];

const packageManagerType = new EnumType(packageManagerCommands);
const fileExtType = new EnumType(fileExts);

type Options = {
  typescript?: true;
  eslint?: true;
  prettier?: true;
  framework?: Framework;
  packageManager?: PackageManagerCommand;
  fileExt?: FileExt;
};

const cmd = new Command<Options>()
  .name("dais")
  .version("0.1.0")
  .description("The platform for your throne.")
  .throwErrors()
  .option("--typescript", "Use TypeScript.")
  .option("--eslint", "Use ESLint.")
  .option("--prettier", "Use Prettier.")
  .type("framework", frameworkType)
  .option("--framework <name:framework>", "Use a specific framework.")
  .type("package-manager", packageManagerType)
  .option(
    "--package-manager, --pm <name:package-manager>",
    "Which package manager to use.",
  )
  .type("file-ext", fileExtType)
  .option("--file-ext <ext:file-ext>", "The configuration file type to use.")
  .action(async (options) => {
    const packageManager = await PackageManager.init(options.packageManager);

    const {
      framework = await Select.prompt({
        message: "Framework?",
        options: ["None", ...frameworks],
      }) as "None" | Framework,

      typescript = await Confirm.prompt({
        message: "TypeScript?",
        default: true,
      }),
    } = options;

    const packages: string[] = [];
    const devPackages: string[] = [];

    switch (framework) {
      case "Next":
        packages.push("next");
        // falls through
      case "React":
        packages.push("react", "react-dom");
        break;
    }

    if (typescript) {
      devPackages.push("typescript");
    }

    const {
      prettier = await Confirm.prompt({
        message: "Prettier?",
        default: true,
      }),
    } = options;

    let prettierConfig: PrettierConfig | undefined;
    if (prettier) {
      devPackages.push("prettier");

      const configurePrettier = await Confirm.prompt({
        message: "Configure Prettier Here?",
        default: true,
      });

      if (configurePrettier) {
        prettierConfig = await new Record({
          printWidth: Entry.Number(80),
          tabWidth: Entry.Number(2),
          useTabs: Entry.Boolean(false),
          semi: Entry.Boolean(true),
          singleQuote: Entry.Boolean(false),
          quoteProps: Entry.Choice(
            ["as-needed", "consistent", "preserve"],
            "as-needed",
          ),
          jsxSingleQuote: Entry.Boolean(false),
          trailingComma: Entry.Choice(["es5", "none", "all"], "es5"),
          bracketSpacing: Entry.Boolean(true),
          jsxBracketSameLine: Entry.Boolean(false),
          arrowParens: Entry.Choice(["always", "avoid"], "always"),
          rangeStart: Entry.Number(0),
          rangeEnd: Entry.Number(Infinity),
          parser: Entry.String(null),
          filepath: Entry.String(null),
          requirePragma: Entry.Boolean(false),
          insertPragma: Entry.Boolean(false),
          proseWrap: Entry.Choice(["always", "never", "preserve"], "preserve"),
          htmlWhitespaceSensitivity: Entry.Choice(
            ["css", "strict", "ignore"],
            "css",
          ),
          vueIndentScriptAndStyle: Entry.Boolean(false),
          endOfLine: Entry.Choice(["lf", "crlf", "cr", "auto"], "lf"),
          embeddedLanguageFormatting: Entry.Choice(["auto", "off"], "auto"),
        }).prompt();
      } else {
        prettierConfig = {};
      }
    }

    const {
      eslint = await Confirm.prompt({
        message: "ESLint?",
        default: true,
      }),
    } = options;

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
          value: "Import",
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
        case "Next":
        case "React":
          devPackages.push("eslint-plugin-react", "eslint-plugin-react-hooks");
          frameworkConfigs.push(
            "plugin:react/recommended",
            "plugin:react-hooks/recommended",
          );
          additionalConfigOptions.push({
            value: "JSX A11y",
            action: () => {
              devPackages.push("eslint-plugin-jsx-a11y");
              frameworkConfigs.push("plugin:jsx-a11y/recommended");
            },
          });
          break;
      }

      await actionCheckboxPrompt({
        message: "ESLint Configurations?",
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

    const {
      fileExt = await Select.prompt({
        message: "Configuration File Extension?",
        options: [...fileExts],
      }) as FileExt,
    } = options;

    const configurationWriter = getConfigurationWriter(fileExt);

    if (prettierConfig) {
      configurationWriter(".prettierrc", prettierConfig);
    }

    if (esLintConfig) {
      configurationWriter(".eslintrc", esLintConfig);
    }

    await packageManager.add(...packages);
    await packageManager.addDev(...devPackages);
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
