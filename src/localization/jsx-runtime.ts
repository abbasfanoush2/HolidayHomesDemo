import {
  createElement,
  useContext,
  Fragment,
  isValidElement,
  cloneElement,
  Children,
  type ReactNode,
  type ElementType,
  type ReactElement,
  type FormEvent,
} from "react";
import { jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { isMotionComponent } from "motion/react";
import { LocaleContext } from "./context";
import { localiseText } from "./catalogue";
import { localeFor } from "./preferences";
export { Fragment };
export type { JSX } from "react/jsx-runtime";
function LocalisedText({ value }: { value: string | number }) {
  const language = useContext(LocaleContext);
  return typeof value === "number"
    ? new Intl.NumberFormat(localeFor(language), {
        maximumFractionDigits: 20,
      }).format(value)
    : localiseText(value, language);
}
function textNodes(children: ReactNode): ReactNode {
  if (typeof children === "function") return children;
  if (
    children &&
    typeof children === "object" &&
    "get" in children &&
    typeof children.get === "function"
  )
    return children;
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number")
      return reactJsx(LocalisedText, { value: child });
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    )
      return cloneElement(child, {}, textNodes(child.props.children));
    return child;
  });
}
function LocalisedElement({
  element,
  original,
}: {
  element: ElementType;
  original: Record<string, unknown>;
}) {
  const language = useContext(LocaleContext);
  const props = { ...original };
  for (const key of [
    "aria-label",
    "aria-description",
    "aria-valuetext",
    "title",
    "alt",
    "placeholder",
    "label",
  ])
    if (typeof props[key] === "string")
      props[key] = localiseText(props[key] as string, language);
  if (
    element === "option" &&
    props.value === undefined &&
    typeof original.children === "string"
  )
    props.value = original.children;
  if (element === "textarea")
    for (const key of ["value", "defaultValue"])
      if (typeof props[key] === "string")
        props[key] = localiseText(props[key] as string, language);
  if (["input", "select", "textarea"].includes(String(element))) {
    const originalInvalid = props.onInvalid as
      ((event: FormEvent<HTMLInputElement>) => void) | undefined;
    const originalInput = props.onInput as
      ((event: FormEvent<HTMLInputElement>) => void) | undefined;
    props.onInvalid = (event: FormEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      input.setCustomValidity("");
      const validity = input.validity;
      const message = validity.valueMissing
        ? "Please complete this field."
        : validity.typeMismatch
          ? "Please enter a valid value."
          : validity.rangeUnderflow
            ? "The value is below the allowed minimum."
            : validity.rangeOverflow
              ? "The value exceeds the allowed maximum."
              : validity.stepMismatch
                ? "Please use a valid increment."
                : validity.patternMismatch
                  ? "Please use the requested format."
                  : "Please check this value.";
      input.setCustomValidity(localiseText(message, language));
      originalInvalid?.(event);
    };
    props.onInput = (event: FormEvent<HTMLInputElement>) => {
      event.currentTarget.setCustomValidity("");
      originalInput?.(event);
    };
  }
  if (props.children !== undefined)
    props.children = textNodes(props.children as ReactNode);
  return createElement(element, props);
}
export function localiseElement(original: ReactElement): ReactElement {
  const { type, key } = original;
  const props = original.props as Record<string, unknown>;
  if (typeof type === "string" || isMotionComponent(type))
    return reactJsx(
      LocalisedElement,
      { element: type, original: props },
      key || undefined,
    );
  return props && "children" in props
    ? cloneElement(original, {
        children: textNodes(props.children as ReactNode),
      } as Partial<unknown>)
    : original;
}
export const jsx: typeof reactJsx = (type, props, key) =>
  localiseElement(reactJsx(type, props, key));
export const jsxs: typeof reactJsxs = (type, props, key) =>
  localiseElement(reactJsxs(type, props, key));
