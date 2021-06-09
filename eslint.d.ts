type Env =
  | "browser"
  | "node"
  | "commonjs"
  | "shared-node-browser"
  | "es6"
  | "es2017"
  | "es2020"
  | "es2021"
  | "worker"
  | "amd"
  | "mocha"
  | "jasmine"
  | "jest"
  | "phantomjs"
  | "protractor"
  | "qunit"
  | "jquery"
  | "prototypejs"
  | "shelljs"
  | "meteor"
  | "mongo"
  | "applescript"
  | "nashorn"
  | "serviceworker"
  | "atomtest"
  | "embertest"
  | "webextensions"
  | "greasemonkey";

type EcmaVersion =
  | 3
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 2015
  | 2016
  | 2017
  | 2018
  | 2019
  | 2020
  | 2021;

type EcmaFeature =
  | "globalReturn"
  | "impliedStrict"
  | "jsx";

type RuleValue = "off" | "warn" | "error" | 0 | 1 | 2;

export type ESLintConfig = {
  root?: true;
  env?: Record<Env, true> | Record<string, true>;
  globals?: Record<string, "writeable" | "readonly" | "off">;
  plugins?: string[];
  settings?: Record<string, unknown>;
  parser?:
    | "espree"
    | "esprima"
    | "@babel/eslint-parser"
    | "@typescript-eslint/parser";
  parserOptions?: {
    ecmaVersion?: EcmaVersion;
    sourceType?: "script" | "module";
    ecmaFeatures?: Record<EcmaFeature, true>;
  };
  processor?: string;
  extends?: string | string[];
  ignorePatterns?: string[];
  rules?: Record<string, RuleValue | [RuleValue, unknown]>;
  noInlineConfig?: true;
  reportUnusedDisableDirectives?: true;
  overrides?: ({
    files: string[];
    excludedFiles?: string | string[];
  } & Omit<ESLintConfig, "overrides">)[];
};
