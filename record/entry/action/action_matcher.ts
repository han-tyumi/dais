import { KeyPressEvent } from "../../deps.ts";

import { Action, ActionOptions } from "./action.ts";
import { HintFormatFunction } from "./hint.ts";

export type ElseActionFunction = (event: KeyPressEvent) => unknown;

export interface ActionMatcherOptions {
  fallthrough?: boolean;
  hintFormat?: HintFormatFunction;
  hintSeparator?: string;
}

export class ActionMatcher {
  static new(options: ActionMatcherOptions = {}) {
    const { fallthrough, hintFormat, hintSeparator } = options;
    return new ActionMatcher(fallthrough, hintFormat, hintSeparator);
  }

  protected actions: Action[] = [];
  protected elseAction: ElseActionFunction | undefined;

  constructor(
    readonly fallthrough?: boolean,
    readonly hintFormat?: HintFormatFunction,
    readonly hintSeparator = " | ",
  ) {}

  add(...optionsList: ActionOptions[]) {
    optionsList.forEach((options) => {
      const { hint, ...rest } = options;
      const action = Action.new({
        fallthrough: this.fallthrough,
        ...rest,
        hint: typeof hint === "object"
          ? { format: this.hintFormat, ...hint }
          : hint,
      });
      this.actions.push(action);
    });
    return this;
  }

  else(action: ElseActionFunction) {
    this.elseAction = action;
    return this;
  }

  match(event: KeyPressEvent) {
    const matches: Action[] = [];

    for (const action of this.actions) {
      if (!action.match(event)) {
        continue;
      }

      matches.push(action);

      if (!action.fallthrough) {
        return matches;
      }
    }

    return matches;
  }

  try(event: KeyPressEvent) {
    const matches: Action[] = [];

    for (const action of this.actions) {
      if (!action.try(event)) {
        continue;
      }

      matches.push(action);

      if (action.fallthrough) {
        return matches;
      }
    }

    if (!matches.length) {
      this.elseAction?.(event);
    }

    return matches;
  }

  hint() {
    const fullHint = this.actions.reduce((fullHint, action) => {
      const { hint } = action;
      if (!hint) {
        return fullHint;
      }

      const hintString = hint.get();
      if (hintString) {
        return fullHint + (fullHint ? this.hintSeparator : "") + hintString;
      }

      return fullHint;
    }, "");

    return fullHint ? fullHint : undefined;
  }
}
