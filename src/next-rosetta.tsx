import React, { useContext, createContext, useState, useEffect } from "react";

import { useRouter } from "next/router";
import rosetta, { Rosetta as RosettaBase } from "rosetta";

type Key = string | number | bigint | symbol;

/**
 * @see https://github.com/microsoft/TypeScript/pull/40336
 */
type PropType<T, Path extends Key> = string extends Path
  ? unknown
  : Path extends keyof T
  ? T[Path]
  : Path extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? PropType<T[K], R>
    : unknown
  : unknown;

type Join<T extends unknown[], D extends string> = T extends []
  ? ""
  : T extends [string | number | boolean | bigint]
  ? `${T[0]}`
  : T extends [string | number | boolean | bigint, ...infer U]
  ? `${T[0]}${D}${Join<U, D>}`
  : string;

// TODO: Improve TS types for object paths
// t("about") -> supported typing
// t("about.title") -> supported typing
// t(["about", "title"]) -> unsupported typing
// t(["about.title"]) -> unsupported typing

export interface RosettaExtended<T> extends Omit<RosettaBase<T>, "t"> {
  /**
   * Inter type from property path (note: using array as path won't infer type)
   * @example <caption>Infer type</caption>
   * const title = t("title");
   * const text = t("landing.title");
   * @example <caption>Force type.</caption>
   * const text = t<string>(["landing", "title"]);
   * const text = t<string>(["landing.feature", index, "description"]);
   */
  t<P extends Key | Key[], X extends Record<string, any> | any[]>(
    key: P,
    params?: X,
    lang?: string,
  ): P extends Key[] ? PropType<T, Join<P, ".">> : P extends Key ? PropType<T, P> : unknown;
  /**
   * Force or overwrite type
   * @example <caption>Infer type</caption>
   * const title = t("title");
   * const text = t("landing.title");
   * @example <caption>Force type.</caption>
   * const text = t<string>(["landing", "title"]);
   * const text = t<string>(["landing.feature", index, "description"]);
   */
  t<F extends any, X extends Record<string, any> | any[] = Record<string, any> | any[]>(key: Key | Key[], params?: X, lang?: string): F;
}

export const I18nContext = createContext<RosettaExtended<any> | null>(null);

export function useI18n<T = any>() {
  const instance = useContext<RosettaExtended<T> | null>(I18nContext);
  if (!instance) {
    throw new Error("There was an error getting i18n instance from context");
  }
  return instance;
}

export type I18nProps<T = any> = {
  table: T;
};

export type I18nProviderProps<T = any> = I18nProps<T> & {
  children?: any;
};

export function I18nProvider<T = any>({ table, ...props }: I18nProviderProps<T>) {
  const { locale } = useRouter();

  const [i18n, setI18n] = useState<RosettaExtended<T>>(() => {
    // Initial state
    const current = rosetta<T>() as RosettaExtended<T>;
    // const current = rosettaExtended<T>();
    current.set(locale!, table);
    current.locale(locale);
    return current;
  });

  const hasChanged = i18n.locale() !== locale;

  useEffect(() => {
    const current = rosetta<T>() as RosettaExtended<T>;
    current.set(locale!, table);
    current.locale(locale);
    setI18n(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChanged, table]);

  return <I18nContext.Provider value={i18n} {...props} />;
}
