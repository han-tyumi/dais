import { Getter, normalizeValueOrGetter, ValueOrGetter } from "../../utils.ts";

export type HintFormatFunction = (
  trigger: string | undefined,
  description: string | undefined,
) => string | undefined;

export type HintOptions = {
  trigger?: ValueOrGetter<string>;
  description?: ValueOrGetter<string>;
  format?: HintFormatFunction;
  show?: ValueOrGetter<boolean>;
};

export class Hint {
  static new(options: HintOptions) {
    const {
      trigger,
      description,
      format = (trigger, description) =>
        trigger && (trigger + (description ? ": " + description : "")),
      show = true,
    } = options;

    return new Hint(
      normalizeValueOrGetter(trigger),
      normalizeValueOrGetter(description),
      format,
      normalizeValueOrGetter(show),
    );
  }

  constructor(
    readonly trigger: Getter<string | undefined>,
    readonly description: Getter<string | undefined>,
    readonly format: HintFormatFunction,
    readonly show: Getter<boolean>,
  ) {}

  get() {
    if (this.show()) {
      return this.format(this.trigger(), this.description());
    }
  }
}
