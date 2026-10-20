import { jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
import { localiseElement } from "./jsx-runtime";
export { Fragment } from "./jsx-runtime";
export type { JSX } from "react/jsx-runtime";
export const jsxDEV: typeof reactJsxDEV = (...args) =>
  localiseElement(reactJsxDEV(...args));
