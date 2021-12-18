import { KeyPressEvent } from "../../deps.ts";

import { Getter, normalizeValueOrGetter, ValueOrGetter } from "../../utils.ts";

import { Hint, HintOptions } from "./hint.ts";

export type MatcherType = string | string[] | Set<string> | RegExp;
export type MatchesFunction = (matcher: MatcherType) => boolean;
export type MatcherFunction = (matches: MatchesFunction) => boolean;
export type MatcherArg = MatcherType | MatcherFunction;

export type ActionFunction = (match: string, event: KeyPressEvent) => unknown;

export interface Modifiers {
  alt?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}
export type ModifierNames = keyof Modifiers;

export interface ActionOptions {
  matcher: MatcherArg;
  action: ActionFunction;
  modifiers?: ModifierNames[];
  exactModifiers?: boolean;
  active?: ValueOrGetter<boolean>;
  fallthrough?: boolean;
  hint?: Partial<HintOptions> | false;
}

function joinMatchers(matchers: string[]) {
  return matchers.join("|");
}

function hintTextFromMatcher(matcher: MatcherArg) {
  if (typeof matcher === "string") {
    return matcher;
  }

  if (matcher instanceof RegExp) {
    return matcher.source;
  }

  if (Array.isArray(matcher)) {
    return joinMatchers(matcher);
  }

  if (matcher instanceof Set) {
    return joinMatchers(Array.from(matcher));
  }
}

type EqualFunction = (prop: string) => boolean;

function matchOrUndefinedFn(prop: string) {
  return (equal: EqualFunction) => equal(prop) ? prop : undefined;
}

function matchPropFn(prop: string | undefined) {
  return prop === undefined ? () => undefined : matchOrUndefinedFn(prop);
}

function matchKeyOrSequenceFn(event: KeyPressEvent) {
  const { key, sequence } = event;
  return (equal: EqualFunction) =>
    matchPropFn(key)(equal) || matchPropFn(sequence)(equal);
}

function findMatchFn(event: KeyPressEvent) {
  const matchKeyOrSequence = matchKeyOrSequenceFn(event);

  return (matcher: MatcherType) => {
    if (typeof matcher === "string") {
      return matchKeyOrSequence((prop) => prop === matcher);
    }

    if (matcher instanceof RegExp) {
      return matchKeyOrSequence(matcher.test.bind(matcher));
    }

    if (Array.isArray(matcher)) {
      matcher = new Set(matcher);
    }

    return matchKeyOrSequence(matcher.has.bind(matcher));
  };
}

function matchModifier(expect: boolean | undefined, actual: boolean) {
  return expect === undefined || expect === actual;
}

export class Action {
  static new(options: ActionOptions) {
    const {
      matcher,
      action,
      modifiers: modifierList = [],
      exactModifiers = true,
      fallthrough = false,
      active = true,
      hint: hintOptions = {},
    } = options;

    const matcherFunction = typeof matcher !== "function"
      ? (keyMatches: MatchesFunction) => keyMatches(matcher)
      : matcher;

    const baseModifiers: Modifiers = exactModifiers
      ? { alt: false, ctrl: false, meta: false, shift: false }
      : {};

    const modifiers: Modifiers = modifierList.reduce(
      (modifiers, option) => ({ ...modifiers, [option]: true }),
      baseModifiers,
    );

    const activeFunction = normalizeValueOrGetter(active);

    const hint = hintOptions !== false
      ? Hint.new({
        trigger: hintTextFromMatcher(matcher),
        show: activeFunction,
        ...hintOptions,
      })
      : undefined;

    return new Action(
      matcherFunction,
      action,
      modifiers,
      fallthrough,
      activeFunction,
      hint,
    );
  }

  constructor(
    readonly matcher: MatcherFunction,
    readonly action: ActionFunction,
    readonly modifiers: Modifiers,
    readonly fallthrough: boolean,
    readonly active: Getter<boolean>,
    readonly hint: Hint | undefined,
  ) {}

  match(event: KeyPressEvent) {
    const findMatch = findMatchFn(event);

    let match: string | undefined;
    const matches: MatchesFunction = (matcher) => {
      match = findMatch(matcher);
      return match !== undefined;
    };

    if (
      this.active() && this.modifiersMatch(event) && this.matcher(matches)
    ) {
      return match;
    }
  }

  try(event: KeyPressEvent) {
    const match = this.match(event);
    if (match !== undefined) {
      this.action(match, event);
    }
    return match;
  }

  protected modifiersMatch(event: KeyPressEvent) {
    const { altKey, ctrlKey, metaKey, shiftKey } = event;
    const { alt, ctrl, meta, shift } = this.modifiers;
    return (
      matchModifier(alt, altKey) &&
      matchModifier(ctrl, ctrlKey) &&
      matchModifier(meta, metaKey) &&
      matchModifier(shift, shiftKey)
    );
  }
}
