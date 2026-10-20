import { createContext } from "react";
import type { Language } from "../domain/types";
export const LocaleContext = createContext<Language>("en");
