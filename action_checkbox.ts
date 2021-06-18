import { Checkbox, CheckboxOption, CheckboxOptions } from "./deps.ts";

type Action = (value: string) => void;

export interface ActionCheckboxOption extends CheckboxOption {
  action: Action;
}

export interface ActionCheckboxOptions extends CheckboxOptions {
  options: ActionCheckboxOption[];
}

export async function actionCheckboxPrompt(options: ActionCheckboxOptions) {
  const selected = await Checkbox.prompt(options);

  if (!selected.length) {
    return selected;
  }

  const actionMap: Record<string, Action> = {};
  for (const option of options.options) {
    const { value, action } = option;
    actionMap[value] = action;
  }

  for (const value of selected) {
    actionMap[value](value);
  }

  return selected;
}
