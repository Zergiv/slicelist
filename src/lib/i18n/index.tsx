"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { en } from "./en";
import { es, type Dict } from "./es";

export type Lang = "es" | "en";
const KEY = "slicelist:lang";
const dicts: Record<Lang, Dict> = { es, en };

const listeners = new Set<() => void>();
// Elección hecha en esta visita; manda aunque no se haya podido guardar.
let chosen: Lang | null = null;

function readLang(): Lang {
  if (chosen) return chosen;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    // Sin almacenamiento disponible: se decide por el idioma del navegador.
  }
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

type I18n = { t: Dict; lang: Lang; setLang: (lang: Lang) => void };
const Ctx = createContext<I18n>({ t: es, lang: "es", setLang: () => {} });

/** Idioma de la interfaz. `fixed` lo deja clavado (para la página de muestra). */
export function I18nProvider({ children, fixed }: { children: React.ReactNode; fixed?: Lang }) {
  // En el servidor se pinta en español; el navegador corrige al hidratar.
  const stored = useSyncExternalStore<Lang>(subscribe, readLang, () => "es");
  const lang = fixed ?? stored;

  const setLang = useCallback((next: Lang) => {
    chosen = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Si no se puede guardar, el cambio vale igual para esta visita.
    }
    listeners.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (!fixed) document.documentElement.lang = lang;
  }, [lang, fixed]);

  return <Ctx.Provider value={{ t: dicts[lang], lang, setLang }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  return useContext(Ctx);
}

export function useT(): Dict {
  return useContext(Ctx).t;
}
