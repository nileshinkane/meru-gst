"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  type DefaultValues,
  type FieldError as HookFormFieldError,
  type FieldValues,
  type Mode,
  type Path,
  type Resolver,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import * as z from "zod";

import { Button } from "@meru/ui/components/button";
import { Checkbox } from "@meru/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@meru/ui/components/field";
import { Input } from "@meru/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@meru/ui/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@meru/ui/components/select";
import { Slider } from "@meru/ui/components/slider";
import { Switch } from "@meru/ui/components/switch";
import { Textarea } from "@meru/ui/components/textarea";
import { cn } from "@meru/ui/lib/utils";

type PrimitiveValue = string | number | boolean | null | undefined;
type FormBuilderValues = Record<string, unknown>;
type ValidationRule =
  | number
  | {
      value: number;
      message?: string;
    };

export type FormBuilderFieldType =
  | "checkbox"
  | "checkbox-group"
  | "email"
  | "hidden"
  | "number"
  | "password"
  | "radio"
  | "select"
  | "slider"
  | "switch"
  | "tel"
  | "text"
  | "textarea"
  | "url";

export type FormBuilderOption = {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
};

export type FormBuilderValidation = {
  required?: boolean | string;
  accepted?: boolean | string;
  email?: boolean | string;
  min?: ValidationRule;
  max?: ValidationRule;
  minItems?: ValidationRule;
  maxItems?: ValidationRule;
  minLength?: ValidationRule;
  maxLength?: ValidationRule;
  pattern?:
    | RegExp
    | string
    | {
        value: RegExp | string;
        message?: string;
      };
};

export type FormBuilderRenderArgs = {
  id: string;
  field: ControllerRenderProps<FormBuilderValues, Path<FormBuilderValues>>;
  fieldState: ControllerFieldState;
  form: UseFormReturn<FormBuilderValues>;
  config: FormBuilderField;
};

export type FormBuilderField = {
  name: string;
  type: FormBuilderFieldType;
  label?: React.ReactNode;
  description?: React.ReactNode;
  placeholder?: string;
  defaultValue?: unknown;
  disabled?: boolean;
  hidden?: boolean;
  required?: boolean;
  options?: FormBuilderOption[];
  validation?: FormBuilderValidation;
  autoComplete?: string;
  className?: string;
  fieldClassName?: string;
  controlClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "checked" | "defaultValue" | "disabled" | "name" | "onChange" | "type" | "value"
  >;
  textareaProps?: Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "defaultValue" | "disabled" | "name" | "onChange" | "value"
  >;
  min?: number;
  max?: number;
  step?: number;
  range?: boolean;
  showValue?: boolean;
  formatValue?: (value: number | number[]) => React.ReactNode;
  render?: (args: FormBuilderRenderArgs) => React.ReactNode;
};

export type FormBuilderErrors = Record<string, string | string[] | undefined>;

export type FormBuilderSubmitResult =
  | void
  | {
      errors?: FormBuilderErrors;
      rootError?: string;
    };

export type FormBuilderProps = {
  id?: string;
  fields: FormBuilderField[];
  schema?: z.ZodTypeAny;
  defaultValues?: DefaultValues<FormBuilderValues>;
  form?: UseFormReturn<FormBuilderValues>;
  mode?: Mode;
  disabled?: boolean;
  noValidate?: boolean;
  className?: string;
  fieldGroupClassName?: string;
  actionsClassName?: string;
  submitLabel?: React.ReactNode;
  resetLabel?: React.ReactNode;
  showActions?: boolean;
  showReset?: boolean;
  children?: React.ReactNode;
  onSubmit: (
    values: FormBuilderValues,
    form: UseFormReturn<FormBuilderValues>,
  ) => Promise<FormBuilderSubmitResult> | FormBuilderSubmitResult;
  onInvalid?: (errors: FieldValues) => void;
};

type ShapeTree = {
  schema?: z.ZodTypeAny;
  children: Record<string, ShapeTree>;
};

const rootErrorNames = new Set(["_root", "form", "root", "root.server"]);

function isRequired(field: FormBuilderField) {
  return Boolean(field.required || field.validation?.required);
}

function validationMessage(
  value: boolean | string | undefined,
  fallback: string,
) {
  return typeof value === "string" ? value : fallback;
}

function ruleValue(rule: ValidationRule | undefined) {
  return typeof rule === "number" ? rule : rule?.value;
}

function ruleMessage(rule: ValidationRule | undefined, fallback: string) {
  return typeof rule === "object" && rule.message ? rule.message : fallback;
}

function normalizeEmpty(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

function splitPath(name: string) {
  return name.split(".").filter(Boolean);
}

function assignPath(target: Record<string, unknown>, name: string, value: unknown) {
  const path = splitPath(name);
  let cursor: Record<string, unknown> = target;

  path.forEach((segment, index) => {
    if (index === path.length - 1) {
      cursor[segment] = value;
      return;
    }

    const next = cursor[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  });
}

function deepMergeDefaults(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
) {
  const merged = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const existing = merged[key];
    if (
      value &&
      existing &&
      typeof value === "object" &&
      typeof existing === "object" &&
      !Array.isArray(value) &&
      !Array.isArray(existing)
    ) {
      merged[key] = deepMergeDefaults(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function fieldDefaultValue(field: FormBuilderField) {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  switch (field.type) {
    case "checkbox":
    case "switch":
      return false;
    case "checkbox-group":
      return [];
    case "number":
      return undefined;
    case "slider":
      if (field.range) {
        return [field.min ?? 0, field.max ?? 100];
      }
      return field.min ?? 0;
    default:
      return "";
  }
}

function fieldLabel(field: FormBuilderField) {
  if (typeof field.label === "string") {
    return field.label;
  }
  return field.name;
}

function optionalStringSchema(base: z.ZodString) {
  return z.preprocess(normalizeEmpty, base.optional());
}

function buildStringSchema(field: FormBuilderField) {
  const required = isRequired(field);
  const validation = field.validation ?? {};
  let schema = z.string();

  if (required) {
    schema = schema.min(
      1,
      validationMessage(
        validation.required,
        `${fieldLabel(field)} is required.`,
      ),
    );
  }

  if (field.type === "email" || validation.email) {
    schema = schema.email(
      validationMessage(validation.email, "Enter a valid email address."),
    );
  }

  const minLength = ruleValue(validation.minLength);
  if (minLength !== undefined) {
    schema = schema.min(
      minLength,
      ruleMessage(
        validation.minLength,
        `${fieldLabel(field)} must be at least ${minLength} characters.`,
      ),
    );
  }

  const maxLength = ruleValue(validation.maxLength);
  if (maxLength !== undefined) {
    schema = schema.max(
      maxLength,
      ruleMessage(
        validation.maxLength,
        `${fieldLabel(field)} must be at most ${maxLength} characters.`,
      ),
    );
  }

  if (validation.pattern) {
    const pattern =
      typeof validation.pattern === "object" && "value" in validation.pattern
        ? validation.pattern.value
        : validation.pattern;
    const message =
      typeof validation.pattern === "object" && "message" in validation.pattern
        ? validation.pattern.message
        : undefined;
    schema = schema.regex(
      typeof pattern === "string" ? new RegExp(pattern) : pattern,
      message ?? `${fieldLabel(field)} has an invalid format.`,
    );
  }

  return required ? schema : optionalStringSchema(schema);
}

function buildNumberSchema(field: FormBuilderField) {
  const required = isRequired(field);
  const validation = field.validation ?? {};
  let schema = z.number();

  const min = ruleValue(validation.min);
  if (min !== undefined) {
    schema = schema.min(
      min,
      ruleMessage(validation.min, `${fieldLabel(field)} must be at least ${min}.`),
    );
  }

  const max = ruleValue(validation.max);
  if (max !== undefined) {
    schema = schema.max(
      max,
      ruleMessage(validation.max, `${fieldLabel(field)} must be at most ${max}.`),
    );
  }

  const numberSchema = required ? schema : schema.optional();

  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    return typeof value === "number" ? value : Number(value);
  }, numberSchema);
}

function buildCheckboxGroupSchema(field: FormBuilderField) {
  const required = isRequired(field);
  const validation = field.validation ?? {};
  let schema = z.array(z.string());
  const minItems = ruleValue(validation.minItems) ?? (required ? 1 : undefined);
  const maxItems = ruleValue(validation.maxItems);

  if (minItems !== undefined) {
    schema = schema.min(
      minItems,
      ruleMessage(
        validation.minItems,
        validationMessage(
          validation.required,
          `Select at least ${minItems} option${minItems === 1 ? "" : "s"}.`,
        ),
      ),
    );
  }

  if (maxItems !== undefined) {
    schema = schema.max(
      maxItems,
      ruleMessage(
        validation.maxItems,
        `Select at most ${maxItems} option${maxItems === 1 ? "" : "s"}.`,
      ),
    );
  }

  return schema;
}

function buildBooleanSchema(field: FormBuilderField) {
  const validation = field.validation ?? {};
  const mustBeAccepted = field.required || validation.accepted;
  let schema = z.boolean();

  if (mustBeAccepted) {
    schema = schema.refine(
      (value) => value,
      validationMessage(
        validation.accepted ?? validation.required,
        `${fieldLabel(field)} must be accepted.`,
      ),
    );
  }

  return schema;
}

function buildSliderSchema(field: FormBuilderField) {
  const validation = field.validation ?? {};
  const min = ruleValue(validation.min) ?? field.min;
  const max = ruleValue(validation.max) ?? field.max;
  const numberSchema = z.number();

  const constrainedNumberSchema = numberSchema
    .refine(
      (value) => min === undefined || value >= min,
      ruleMessage(validation.min, `${fieldLabel(field)} must be at least ${min}.`),
    )
    .refine(
      (value) => max === undefined || value <= max,
      ruleMessage(validation.max, `${fieldLabel(field)} must be at most ${max}.`),
    );

  return field.range ? z.array(constrainedNumberSchema).min(2) : constrainedNumberSchema;
}

function buildFieldSchema(field: FormBuilderField): z.ZodTypeAny {
  switch (field.type) {
    case "checkbox":
    case "switch":
      return buildBooleanSchema(field);
    case "checkbox-group":
      return buildCheckboxGroupSchema(field);
    case "hidden":
      return z.unknown().optional();
    case "number":
      return buildNumberSchema(field);
    case "slider":
      return buildSliderSchema(field);
    default:
      return buildStringSchema(field);
  }
}

function addSchemaNode(node: ShapeTree, path: string[], schema: z.ZodTypeAny) {
  const [segment, ...rest] = path;
  if (!segment) {
    return;
  }

  if (rest.length === 0) {
    node.children[segment] = { schema, children: {} };
    return;
  }

  node.children[segment] ??= { children: {} };
  addSchemaNode(node.children[segment], rest, schema);
}

function compileSchemaNode(node: ShapeTree): z.ZodTypeAny {
  if (Object.keys(node.children).length === 0) {
    return node.schema ?? z.unknown().optional();
  }

  return z.object(
    Object.fromEntries(
      Object.entries(node.children).map(([key, child]) => [
        key,
        compileSchemaNode(child),
      ]),
    ),
  );
}

export function buildFormBuilderSchema(fields: FormBuilderField[]) {
  const root: ShapeTree = { children: {} };

  fields
    .filter((field) => !field.hidden || field.type === "hidden")
    .forEach((field) => {
      addSchemaNode(root, splitPath(field.name), buildFieldSchema(field));
    });

  return compileSchemaNode(root);
}

export function getFormBuilderDefaultValues(
  fields: FormBuilderField[],
  defaultValues: DefaultValues<FormBuilderValues> = {},
) {
  const generated: Record<string, unknown> = {};

  fields.forEach((field) => {
    assignPath(generated, field.name, fieldDefaultValue(field));
  });

  return deepMergeDefaults(
    generated,
    defaultValues as Record<string, unknown>,
  ) as DefaultValues<FormBuilderValues>;
}

export function applyFormBuilderErrors(
  form: UseFormReturn<FormBuilderValues>,
  errors: FormBuilderErrors,
) {
  for (const [name, value] of Object.entries(errors)) {
    const messages = Array.isArray(value) ? value : value ? [value] : [];
    const message = messages.filter(Boolean).join("\n");

    if (!message) {
      continue;
    }

    const fieldName = rootErrorNames.has(name) ? "root.server" : name;
    form.setError(fieldName as Path<FormBuilderValues>, {
      type: "server",
      message,
    });
  }
}

function controlId(formId: string, field: FormBuilderField, suffix?: string) {
  return [formId, field.name, suffix]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9_-]/g, "-");
}

function asStringValue(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function asBooleanValue(value: unknown) {
  return value === true;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function asSliderValue(field: FormBuilderField, value: unknown) {
  if (field.range) {
    return Array.isArray(value)
      ? value.map(Number)
      : [field.min ?? 0, field.max ?? 100];
  }

  return [typeof value === "number" ? value : field.min ?? 0];
}

function renderRequired(field: FormBuilderField) {
  if (!isRequired(field)) {
    return null;
  }

  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  );
}

function renderFieldError(error?: HookFormFieldError) {
  return error ? <FieldError errors={[error]} /> : null;
}

function renderRootError(form: UseFormReturn<FormBuilderValues>) {
  const root = form.formState.errors.root as
    | {
        message?: string;
        server?: { message?: string };
      }
    | undefined;
  const message = root?.server?.message ?? root?.message;

  return message ? <FieldError>{message}</FieldError> : null;
}

function renderTextControl({
  config,
  disabled,
  field,
  fieldState,
  id,
}: FormBuilderRenderArgs & { disabled?: boolean }) {
  const type = config.type === "textarea" ? undefined : config.type;

  return (
    <Field
      data-invalid={fieldState.invalid}
      className={cn(config.fieldClassName, config.className)}
    >
      {config.label ? (
        <FieldLabel htmlFor={id} className={config.labelClassName}>
          {config.label}
          {renderRequired(config)}
        </FieldLabel>
      ) : null}
      {config.type === "textarea" ? (
        <Textarea
          {...field}
          {...config.textareaProps}
          id={id}
          value={asStringValue(field.value)}
          placeholder={config.placeholder}
          disabled={disabled || config.disabled}
          aria-invalid={fieldState.invalid}
          className={config.controlClassName}
        />
      ) : (
        <Input
          {...field}
          {...config.inputProps}
          id={id}
          type={type}
          value={asStringValue(field.value)}
          placeholder={config.placeholder}
          autoComplete={config.autoComplete}
          disabled={disabled || config.disabled}
          aria-invalid={fieldState.invalid}
          className={config.controlClassName}
        />
      )}
      {config.description ? (
        <FieldDescription className={config.descriptionClassName}>
          {config.description}
        </FieldDescription>
      ) : null}
      {renderFieldError(fieldState.error)}
    </Field>
  );
}

function renderNumberControl({
  config,
  disabled,
  field,
  fieldState,
  id,
}: FormBuilderRenderArgs & { disabled?: boolean }) {
  return (
    <Field
      data-invalid={fieldState.invalid}
      className={cn(config.fieldClassName, config.className)}
    >
      {config.label ? (
        <FieldLabel htmlFor={id} className={config.labelClassName}>
          {config.label}
          {renderRequired(config)}
        </FieldLabel>
      ) : null}
      <Input
        {...config.inputProps}
        id={id}
        name={field.name}
        ref={field.ref}
        type="number"
        min={config.min}
        max={config.max}
        step={config.step}
        value={asStringValue(field.value)}
        placeholder={config.placeholder}
        autoComplete={config.autoComplete}
        disabled={disabled || config.disabled}
        aria-invalid={fieldState.invalid}
        className={config.controlClassName}
        onBlur={field.onBlur}
        onChange={(event) => {
          const value = event.target.value;
          field.onChange(value === "" ? undefined : event.target.valueAsNumber);
        }}
      />
      {config.description ? (
        <FieldDescription className={config.descriptionClassName}>
          {config.description}
        </FieldDescription>
      ) : null}
      {renderFieldError(fieldState.error)}
    </Field>
  );
}

function renderSelectControl({
  config,
  disabled,
  field,
  fieldState,
  id,
}: FormBuilderRenderArgs & { disabled?: boolean }) {
  return (
    <Field
      data-invalid={fieldState.invalid}
      className={cn(config.fieldClassName, config.className)}
    >
      {config.label ? (
        <FieldLabel htmlFor={id} className={config.labelClassName}>
          {config.label}
          {renderRequired(config)}
        </FieldLabel>
      ) : null}
      <Select
        name={field.name}
        value={asStringValue(field.value)}
        onValueChange={field.onChange}
        onOpenChange={(open) => {
          if (!open) {
            field.onBlur();
          }
        }}
        disabled={disabled || config.disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={fieldState.invalid}
          className={cn("w-full", config.controlClassName)}
        >
          <SelectValue placeholder={config.placeholder ?? "Select"} />
        </SelectTrigger>
        <SelectContent>
          {(config.options ?? []).map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {config.description ? (
        <FieldDescription className={config.descriptionClassName}>
          {config.description}
        </FieldDescription>
      ) : null}
      {renderFieldError(fieldState.error)}
    </Field>
  );
}

function renderSingleCheckboxControl({
  config,
  disabled,
  field,
  fieldState,
  id,
}: FormBuilderRenderArgs & { disabled?: boolean }) {
  return (
    <Field
      orientation="horizontal"
      data-invalid={fieldState.invalid}
      data-disabled={disabled || config.disabled}
      className={cn(config.fieldClassName, config.className)}
    >
      <Checkbox
        id={id}
        name={field.name}
        ref={field.ref}
        checked={asBooleanValue(field.value)}
        disabled={disabled || config.disabled}
        aria-invalid={fieldState.invalid}
        className={config.controlClassName}
        onBlur={field.onBlur}
        onCheckedChange={(checked) => field.onChange(checked === true)}
      />
      <FieldContent>
        {config.label ? (
          <FieldLabel htmlFor={id} className={config.labelClassName}>
            {config.label}
            {renderRequired(config)}
          </FieldLabel>
        ) : null}
        {config.description ? (
          <FieldDescription className={config.descriptionClassName}>
            {config.description}
          </FieldDescription>
        ) : null}
        {renderFieldError(fieldState.error)}
      </FieldContent>
    </Field>
  );
}

function renderSwitchControl({
  config,
  disabled,
  field,
  fieldState,
  id,
}: FormBuilderRenderArgs & { disabled?: boolean }) {
  return (
    <Field
      orientation="horizontal"
      data-invalid={fieldState.invalid}
      data-disabled={disabled || config.disabled}
      className={cn(config.fieldClassName, config.className)}
    >
      <FieldContent>
        {config.label ? (
          <FieldLabel htmlFor={id} className={config.labelClassName}>
            {config.label}
            {renderRequired(config)}
          </FieldLabel>
        ) : null}
        {config.description ? (
          <FieldDescription className={config.descriptionClassName}>
            {config.description}
          </FieldDescription>
        ) : null}
        {renderFieldError(fieldState.error)}
      </FieldContent>
      <Switch
        id={id}
        name={field.name}
        ref={field.ref}
        checked={asBooleanValue(field.value)}
        disabled={disabled || config.disabled}
        aria-invalid={fieldState.invalid}
        className={config.controlClassName}
        onBlur={field.onBlur}
        onCheckedChange={field.onChange}
      />
    </Field>
  );
}

function renderCheckboxGroupControl({
  config,
  disabled,
  field,
  fieldState,
  id,
}: FormBuilderRenderArgs & { disabled?: boolean }) {
  const value = asStringArray(field.value);

  return (
    <FieldSet className={cn(config.fieldClassName, config.className)}>
      {config.label ? (
        <FieldLegend variant="label" className={config.labelClassName}>
          {config.label}
          {renderRequired(config)}
        </FieldLegend>
      ) : null}
      {config.description ? (
        <FieldDescription className={config.descriptionClassName}>
          {config.description}
        </FieldDescription>
      ) : null}
      <FieldGroup data-slot="checkbox-group">
        {(config.options ?? []).map((option) => {
          const optionId = controlId(id, config, option.value);
          const checked = value.includes(option.value);

          return (
            <Field
              key={option.value}
              orientation="horizontal"
              data-invalid={fieldState.invalid}
              data-disabled={disabled || config.disabled || option.disabled}
            >
              <Checkbox
                id={optionId}
                name={field.name}
                checked={checked}
                disabled={disabled || config.disabled || option.disabled}
                aria-invalid={fieldState.invalid}
                onCheckedChange={(nextChecked) => {
                  const nextValue =
                    nextChecked === true
                      ? [...value, option.value]
                      : value.filter((item) => item !== option.value);
                  field.onChange(nextValue);
                }}
              />
              <FieldContent>
                <FieldLabel htmlFor={optionId} className="font-normal">
                  {option.label}
                </FieldLabel>
                {option.description ? (
                  <FieldDescription>{option.description}</FieldDescription>
                ) : null}
              </FieldContent>
            </Field>
          );
        })}
      </FieldGroup>
      {renderFieldError(fieldState.error)}
    </FieldSet>
  );
}

function renderRadioControl({
  config,
  disabled,
  field,
  fieldState,
  id,
}: FormBuilderRenderArgs & { disabled?: boolean }) {
  return (
    <FieldSet className={cn(config.fieldClassName, config.className)}>
      {config.label ? (
        <FieldLegend variant="label" className={config.labelClassName}>
          {config.label}
          {renderRequired(config)}
        </FieldLegend>
      ) : null}
      {config.description ? (
        <FieldDescription className={config.descriptionClassName}>
          {config.description}
        </FieldDescription>
      ) : null}
      <RadioGroup
        name={field.name}
        value={asStringValue(field.value)}
        onValueChange={field.onChange}
        className={config.controlClassName}
      >
        {(config.options ?? []).map((option) => {
          const optionId = controlId(id, config, option.value);

          return (
            <Field
              key={option.value}
              orientation="horizontal"
              data-invalid={fieldState.invalid}
              data-disabled={disabled || config.disabled || option.disabled}
            >
              <RadioGroupItem
                id={optionId}
                value={option.value}
                disabled={disabled || config.disabled || option.disabled}
                aria-invalid={fieldState.invalid}
              />
              <FieldContent>
                <FieldLabel htmlFor={optionId} className="font-normal">
                  {option.label}
                </FieldLabel>
                {option.description ? (
                  <FieldDescription>{option.description}</FieldDescription>
                ) : null}
              </FieldContent>
            </Field>
          );
        })}
      </RadioGroup>
      {renderFieldError(fieldState.error)}
    </FieldSet>
  );
}

function renderSliderControl({
  config,
  disabled,
  field,
  fieldState,
  id,
}: FormBuilderRenderArgs & { disabled?: boolean }) {
  const value = asSliderValue(config, field.value);
  const displayValue = config.range ? value : value[0];

  return (
    <Field
      data-invalid={fieldState.invalid}
      className={cn(config.fieldClassName, config.className)}
    >
      {config.label ? (
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={id} className={config.labelClassName}>
            {config.label}
            {renderRequired(config)}
          </FieldLabel>
          {config.showValue ? (
            <span className="text-sm tabular-nums text-muted-foreground">
              {config.formatValue
                ? config.formatValue(displayValue)
                : Array.isArray(displayValue)
                  ? displayValue.join(" - ")
                  : displayValue}
            </span>
          ) : null}
        </div>
      ) : null}
      <Slider
        id={id}
        name={field.name}
        ref={field.ref}
        value={value}
        min={config.min}
        max={config.max}
        step={config.step}
        disabled={disabled || config.disabled}
        aria-invalid={fieldState.invalid}
        className={config.controlClassName}
        onBlur={field.onBlur}
        onValueChange={(nextValue) => {
          field.onChange(config.range ? nextValue : nextValue[0]);
        }}
      />
      {config.description ? (
        <FieldDescription className={config.descriptionClassName}>
          {config.description}
        </FieldDescription>
      ) : null}
      {renderFieldError(fieldState.error)}
    </Field>
  );
}

function FormBuilderFieldController({
  config,
  disabled,
  form,
  formId,
}: {
  config: FormBuilderField;
  disabled?: boolean;
  form: UseFormReturn<FormBuilderValues>;
  formId: string;
}) {
  const id = controlId(formId, config);

  if (config.hidden && config.type !== "hidden") {
    return null;
  }

  return (
    <Controller
      name={config.name as Path<FormBuilderValues>}
      control={form.control}
      render={({ field, fieldState }) => {
        const args = { config, field, fieldState, form, id };

        if (config.render) {
          return <>{config.render(args)}</>;
        }

        switch (config.type) {
          case "checkbox":
            return renderSingleCheckboxControl({ ...args, disabled });
          case "checkbox-group":
            return renderCheckboxGroupControl({ ...args, disabled });
          case "hidden":
            return (
              <input
                type="hidden"
                name={field.name}
                value={asStringValue(field.value)}
                ref={field.ref}
              />
            );
          case "number":
            return renderNumberControl({ ...args, disabled });
          case "radio":
            return renderRadioControl({ ...args, disabled });
          case "select":
            return renderSelectControl({ ...args, disabled });
          case "slider":
            return renderSliderControl({ ...args, disabled });
          case "switch":
            return renderSwitchControl({ ...args, disabled });
          default:
            return renderTextControl({ ...args, disabled });
        }
      }}
    />
  );
}

function FormBuilder({
  id,
  fields,
  schema,
  defaultValues,
  form,
  mode = "onBlur",
  disabled,
  noValidate = true,
  className,
  fieldGroupClassName,
  actionsClassName,
  submitLabel = "Submit",
  resetLabel = "Reset",
  showActions = true,
  showReset = false,
  children,
  onSubmit,
  onInvalid,
}: FormBuilderProps) {
  const reactId = React.useId();
  const formId = id ?? `form-builder-${reactId.replace(/:/g, "")}`;
  const resolvedSchema = React.useMemo(
    () => schema ?? buildFormBuilderSchema(fields),
    [fields, schema],
  );
  const resolvedDefaultValues = React.useMemo(
    () => getFormBuilderDefaultValues(fields, defaultValues),
    [fields, defaultValues],
  );
  const internalForm = useForm<FormBuilderValues>({
    defaultValues: resolvedDefaultValues,
    mode,
    resolver: zodResolver(
      resolvedSchema as z.ZodType<unknown, FieldValues>,
    ) as Resolver<FormBuilderValues>,
  });
  const activeForm = form ?? internalForm;
  const submitting = activeForm.formState.isSubmitting;

  async function handleValidSubmit(values: FormBuilderValues) {
    activeForm.clearErrors("root" as Path<FormBuilderValues>);
    const result = await onSubmit(values, activeForm);

    if (result?.rootError) {
      activeForm.setError("root.server" as Path<FormBuilderValues>, {
        type: "server",
        message: result.rootError,
      });
    }

    if (result?.errors) {
      applyFormBuilderErrors(activeForm, result.errors);
    }
  }

  return (
    <form
      id={formId}
      noValidate={noValidate}
      className={cn("flex w-full flex-col gap-5", className)}
      onSubmit={activeForm.handleSubmit(handleValidSubmit, onInvalid)}
    >
      <FieldGroup className={fieldGroupClassName}>
        {fields.map((field) => (
          <FormBuilderFieldController
            key={field.name}
            config={field}
            disabled={disabled || submitting}
            form={activeForm}
            formId={formId}
          />
        ))}
        {renderRootError(activeForm)}
      </FieldGroup>
      {showActions ? (
        <Field orientation="horizontal" className={cn("justify-end", actionsClassName)}>
          {showReset ? (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || submitting}
              onClick={() => activeForm.reset(resolvedDefaultValues)}
            >
              {resetLabel}
            </Button>
          ) : null}
          {children}
          <Button type="submit" disabled={disabled || submitting}>
            {submitting ? "Submitting..." : submitLabel}
          </Button>
        </Field>
      ) : (
        children
      )}
    </form>
  );
}

export { FormBuilder };
