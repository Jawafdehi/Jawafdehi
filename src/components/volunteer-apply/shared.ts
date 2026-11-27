import { createContext, useContext } from "react";
import { COPY, type Copy, type Lang } from "@/components/volunteer-apply/copy";

export const LangCtx = createContext<{ c: Copy; lang: Lang }>({ c: COPY.en, lang: "en" });
export const useCopy = () => useContext(LangCtx);

export const REQUIRED = "__required__";
export const NEPAL_MOBILE = /^9[678]\d{8}$/;
export const digitsOf = (v: string) => v.replace(/\D/g, "");

export const INVALID_RING = "border-danger ring-2 ring-danger/25";
export const INPUT_SHAPE = "h-12 rounded-full px-5 text-base";
