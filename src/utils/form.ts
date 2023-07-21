import { ref } from "lit/directives/ref.js";

export type Rule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

export type FormElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

export type Value =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | null
  | undefined;

export const isCheckbox = (
  element: FormElement
): element is HTMLInputElement => {
  return element.type === "checkbox";
};

export const isRadio = (element: FormElement): element is HTMLInputElement => {
  return element.type === "radio";
};

export const isRadioOrCheckbox = (
  element: FormElement
): element is HTMLInputElement => {
  return isRadio(element) || isCheckbox(element);
};

export class Form<K extends string> {
  protected elements: Map<K, FormElement | FormElement[]> = new Map();
  protected errors: Map<K, string[]> = new Map();
  protected values: Map<K, Value> = new Map();

  constructor(
    protected options: {
      rules: Record<K, Rule>;
      defaultValues?: Record<K, Value>;
      onChange?: (data: {
        valid: boolean;
        errors: Record<K, string[]>;
        values: Record<K, Value>;
      }) => void;
    }
  ) {
    this.reset();
  }

  register(
    name: K,
    options?: {
      eventType?: "changed" | "input";
    }
  ) {
    const onChange = (event: Event) => {
      const element = event.target as FormElement;
      if (isCheckbox(element)) {
        const elements = this.elements.get(name) as
          | HTMLInputElement[]
          | undefined;
        if (elements && elements.length > 1) {
          const values = elements
            .filter((el) => el.checked)
            .map((el) => el.value);
          this.values.set(name, values);
        } else {
          this.values.set(name, element.checked);
        }
      } else {
        this.values.set(name, element.value);
      }
      this.validateField(name);
      this.options.onChange?.({
        valid: this.validate(),
        values: this.getValues(),
        errors: this.getErrors(),
      });
    };

    return ref((element) => {
      if (element) {
        element.setAttribute("name", name);
        const existing = this.elements.get(name);
        if (existing && isRadioOrCheckbox(element as FormElement)) {
          if (Array.isArray(existing)) {
            existing.push(element as FormElement);
          } else {
            this.elements.set(name, [existing, element as FormElement]);
          }
        } else if (existing) {
          if (Array.isArray(existing)) {
            existing?.forEach((element) =>
              element.removeEventListener(
                options?.eventType ?? "input",
                onChange
              )
            );
          } else {
            existing.removeEventListener(
              options?.eventType ?? "input",
              onChange
            );
          }
          this.elements.set(name, element as FormElement);
        } else {
          this.elements.set(name, element as FormElement);
        }
        element.addEventListener(options?.eventType ?? "input", onChange);
      } else {
        const existing = this.elements.get(name);
        if (Array.isArray(existing)) {
          existing?.forEach((element) =>
            element.removeEventListener(options?.eventType ?? "input", onChange)
          );
        } else {
          existing?.removeEventListener(
            options?.eventType ?? "input",
            onChange
          );
        }
        this.elements.delete(name);
      }
    });
  }

  attachErrors(element: FormElement, errors: string[]) {
    element.classList.remove("invalid");
    const errorElement = element.nextElementSibling;
    if (errorElement && errorElement.classList.contains("error")) {
      errorElement.remove();
    }
    if (!errors.length) return;

    element.classList.add("invalid");
    const error = document.createElement("label");
    error.htmlFor = element.id;
    error.classList.add("error");
    error.textContent = errors[0];
    element.after(error);
  }

  validateField(name: K) {
    const value = this.values.get(name);
    const rule = this.options.rules[name];
    let errors = [];
    if (rule.required) errors.push(Form.required(value));
    if (rule.minLength) errors.push(Form.minLength(value, rule.minLength));
    if (rule.maxLength) errors.push(Form.maxLength(value, rule.maxLength));
    errors = errors.filter(Boolean);
    this.errors.set(name, errors);
    return errors;
  }

  validate() {
    let valid = true;
    for (const [name, elements] of this.elements) {
      if (Array.isArray(elements) ? !elements.length : !elements) continue;
      const errors = this.validateField(name);
      if (errors.length) valid = false;
    }
    return valid;
  }

  getValue(name: K) {
    return this.values.get(name);
  }

  getValues() {
    return Object.fromEntries(this.values.entries()) as Record<K, Value>;
  }

  setValue(name: K, value: Value) {
    this.values.set(name, value);
    const elements = this.elements.get(name);
    //if (elements?.length) element.value = value as string;
  }

  setValues(values: Record<K, Value>) {
    for (const [name, value] of Object.entries<Value>(values)) {
      this.setValue(name as K, value);
    }
  }

  getError(name: K) {
    return this.errors.get(name);
  }

  getErrors() {
    return Object.fromEntries(this.errors.entries()) as Record<K, string[]>;
  }

  reset() {
    const defaultValues = this.options.defaultValues;
    if (!defaultValues) return;
    this.values.clear();
    this.setValues(defaultValues);
  }

  handleSubmit(callback: (values: Record<K, Value>) => void) {
    return (event: SubmitEvent) => {
      event.preventDefault();
      if (this.validate()) callback(this.getValues());
    };
  }

  // Rules

  static required(value: Value) {
    if (typeof value === "number" || typeof value === "boolean") return "";
    return value === undefined || value === null || value.length === 0
      ? "The field is required"
      : "";
  }

  static minLength(value: any, length: number) {
    return "length" in value && value.length < length
      ? `The field must be at least ${length} characters`
      : "";
  }

  static maxLength(value: any, length: number) {
    return "length" in value && value.length > length
      ? `The field must be at most ${length} characters`
      : "";
  }
}
