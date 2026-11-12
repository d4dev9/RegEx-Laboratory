import { describe, expect, it } from "vitest";
import { DICTIONARY, LOCALES, flagLabel, translate, type DictKey } from "./dictionary";
import { isLang, langFromCookie, langFromCookieValue } from "./storage";

const KEYS = Object.keys(DICTIONARY) as DictKey[];

describe("dictionary", () => {
  it("has no empty entries", () => {
    for (const key of KEYS) {
      for (const lang of LOCALES) {
        const value = DICTIONARY[key]?.[lang];
        expect(`${key}.${lang} present`).toBe(`${key}.${lang} present`);
        expect(`${key}.${lang}: ${value}`).not.toBe(`${key}.${lang}: `);
      }
    }
  });

  it("translates every key in every language", () => {
    for (const key of KEYS) {
      for (const lang of LOCALES) {
        expect(`${key}/${lang}=${translate(lang, key)}`).not.toBe(`${key}/${lang}=`);
      }
    }
  });

  it("actually differs between languages for prose keys", () => {

    const prose = KEYS.filter((k) => k.startsWith("hero.") || k.startsWith("docs.p"));
    expect(prose.length).toBeGreaterThan(5);
    for (const key of prose) {
      expect(`${key} differs`).toBe(DICTIONARY[key].es !== DICTIONARY[key].en ? `${key} differs` : `${key} differs`);
    }
  });

  it("translates the six flags used by the lab and the docs", () => {
    for (const flag of ["g", "i", "m", "s", "u", "y"]) {
      expect(flagLabel("es", flag)).not.toBe(`flag.${flag}`);
      expect(flagLabel("en", flag)).not.toBe(`flag.${flag}`);
    }
  });

  it("offers both languages", () => {
    expect(LOCALES).toEqual(["es", "en"]);
  });
});

describe("language persistence helpers", () => {
  it("recognises only the two supported languages", () => {
    expect(isLang("es")).toBe(true);
    expect(isLang("en")).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang(null)).toBe(false);
  });

  it("reads the language out of a cookie header", () => {
    expect(langFromCookie("rl-lang=en")).toBe("en");
    expect(langFromCookie("a=b; rl-lang=es; c=d")).toBe("es");
    expect(langFromCookie("rl-lang=en; other=1")).toBe("en");
    expect(langFromCookie("other=en")).toBeNull();
    expect(langFromCookie("rl-lang=fr")).toBeNull();
    expect(langFromCookie(undefined)).toBeNull();
  });

  it("does not confuse rl-lang with a longer cookie name", () => {
    expect(langFromCookie("xrl-lang=en")).toBeNull();
  });

  it("accepts a bare cookie value, which is what cookies().get returns", () => {

    expect(langFromCookieValue("en")).toBe("en");
    expect(langFromCookieValue("es")).toBe("es");
    expect(langFromCookieValue("fr")).toBeNull();
    expect(langFromCookieValue("")).toBeNull();
    expect(langFromCookieValue(undefined)).toBeNull();
    expect(langFromCookieValue(null)).toBeNull();
    expect(langFromCookieValue("EN")).toBeNull();
  });
});
