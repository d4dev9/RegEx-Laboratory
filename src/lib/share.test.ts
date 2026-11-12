import { describe, expect, it } from "vitest";

import {
  decodeState,
  encodeState,
  isSharedState,
  readHash,
  shareHref,
  shortHref,
  SHARED_MARKER,
  type SharedState,
} from "@/lib/share";
import { MAX_INPUT_LENGTH, MAX_REGEX_LENGTH } from "@/lib/regex/limits";

const EMAIL: SharedState = {
  p: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  f: "gimsu",
  t: "Contacta con nosotros en soporte@ejemplo.com\nOtra línea: ñáéíóú",
};

describe("ida y vuelta", () => {
  it("restaura exactamente lo que se comprimió", () => {
    expect(decodeState(encodeState(EMAIL))).toEqual(EMAIL);
  });

  it("conserva los acentos, los saltos de linea y las tabulaciones", () => {

    const state: SharedState = {
      p: "\\p{L}+",
      f: "gu",
      t: "año\nñandú\ttabulado  Ñ ÁÉÍÓÚ ü",
    };

    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it("conserva un patron vacio", () => {

    expect(decodeState(encodeState({ p: "", f: "", t: "" }))).toEqual({
      p: "",
      f: "",
      t: "",
    });
  });

  it("conserva un texto muy largo", () => {
    const text = Array.from(
      { length: 400 },
      (_, i) => `Línea ${i}: algo de texto repetido.`
    ).join("\n");

    expect(decodeState(encodeState({ p: "x+", f: "g", t: text }))?.t).toBe(text);
  });

  it("el token solo usa caracteres válidos en un fragmento", () => {

    const token = encodeState(EMAIL);
    expect(token).toMatch(/^[A-Za-z0-9~_-]+$/);
    expect(token).not.toContain("+");
    expect(token).not.toContain("$");
  });
});

describe("el token se distingue de un id de patron guardado", () => {
  it("lleva el marcador", () => {
    expect(encodeState(EMAIL).startsWith(SHARED_MARKER)).toBe(true);
    expect(isSharedState(encodeState(EMAIL))).toBe(true);
  });

  it("un id guardado no parece un token comprimido", () => {

    for (const id of ["cm1234abcdefghijklmnop", "git-hash", "starter-email"]) {
      expect(isSharedState(id)).toBe(false);
    }
  });

  it("un id con el marcador delante SI se lee como payload", () => {

    expect(isSharedState(`${SHARED_MARKER}cualquiera`)).toBe(true);
  });
});

describe("el fragmento se lee bien", () => {
  it("lee el payload comprimido", () => {
    const hash = `#s=${encodeState(EMAIL)}`;

    expect(readHash(hash)).toEqual({ p: EMAIL.p, f: EMAIL.f, t: EMAIL.t });
  });

  it("lee `s` sin pasar por URLSearchParams", () => {

    const token = encodeState(EMAIL);
    expect(token).not.toContain("+");

    const throughParams = new URLSearchParams(`s=${token}`).get("s");
    expect(throughParams).toBe(token);

    expect(readHash(`#s=${token}`)).toEqual({ p: EMAIL.p, f: EMAIL.f, t: EMAIL.t });
  });

  it("un enlace truncado no revienta: devuelve vacío", () => {

    const token = encodeState(EMAIL);
    expect(readHash(`#s=${token.slice(0, 40)}`)).toEqual({});
    expect(readHash(`#s=${SHARED_MARKER}`)).toEqual({});
    expect(readHash(`#s=${SHARED_MARKER}@@@no-es-comprimido@@@`)).toEqual({});
  });

  it("un payload que no es JSON con tres cadenas devuelve vacío", () => {

    const wrongShape = encodeStateAs("{ not json at all");
    expect(readHash(`#s=${wrongShape}`)).toEqual({});

    const wrongTypes = encodeStateAs(JSON.stringify({ p: 1, f: "g", t: "x" }));
    expect(readHash(`#s=${wrongTypes}`)).toEqual({});

    const partial = encodeStateAs(JSON.stringify({ p: "x" }));
    expect(readHash(`#s=${partial}`)).toEqual({});
  });
});

describe("retrocompatibilidad con los enlaces antiguos", () => {
  it("sigue leyendo un token del formato anterior, con `+` y `$`", () => {

    const legacy =
      "~N4IgDiBcINoIYFoBeBBBAtADAgnAOgH0BSAagQF0SABeZNLXPCkgHRb1tQ3OACYAaAL4h+IAGZQQAcwC2ATwDOAVwCWIkABdJAYQD2AOw1wAxkYAExg2f26FujQCdbZgKb6zdsLocaXVFwBWLjJgADa6eJYyLDZmAG5uRgr+IQ4uCnB43lJmYHAOcGYyAIcKZir6YhFmAMoVZgAmcBq2kNa6YH7hxnChABa2WoJAA";

    expect(legacy).toContain("+");

    expect(readHash(`#s=${legacy}`)).toEqual({
      p: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
      f: "gmysui",
      t: "Contacta con nosotros en soporte@ejemplo.com\no ventas@empresa.org para más info. Sin datos: nope@localhost",
    });
  });

  it("sigue leyendo `#p=...&f=...&t=...`", () => {
    const hash =
      "#p=%5Ba-z%5D%2B&f=gi&t=Contacta+con+nosotros+en+soporte%40ejemplo.com";

    expect(readHash(hash)).toEqual({
      p: "[a-z]+",
      f: "gi",
      t: "Contacta con nosotros en soporte@ejemplo.com",
    });
  });

  it("sigue leyendo un enlace antiguo sin texto", () => {
    expect(readHash("#p=%5Cd%2B&f=g")).toEqual({
      p: "\\d+",
      f: "g",
      t: undefined,
      s: undefined,
    });
  });

  it("sigue leyendo `#s=<id>` como id, no como payload", () => {

    expect(readHash("#s=cm1234abcdefghijklmnop")).toEqual({
      p: undefined,
      f: undefined,
      t: undefined,
      s: "cm1234abcdefghijklmnop",
    });
  });

  it("el payload comprimido gana sobre una clave antigua pegada al lado", () => {

    const hash = `#s=${encodeState(EMAIL)}&p=basura&f=z`;

    expect(readHash(hash)).toEqual({ p: EMAIL.p, f: EMAIL.f, t: EMAIL.t });
  });

  it("un hash vacío no rompe nada", () => {
    expect(readHash("")).toEqual({
      p: undefined,
      f: undefined,
      t: undefined,
      s: undefined,
    });
  });
});

describe("el enlace que se genera", () => {
  it("tiene la forma pedida", () => {
    const href = shareHref("https://regexlab.indevs.in/lab", EMAIL.p, EMAIL.f, EMAIL.t);

    expect(href.startsWith("https://regexlab.indevs.in/lab#s=")).toBe(true);
  });

  it("no lleva texto plano ni escapes de porcentaje", () => {

    const href = shareHref("https://regexlab.indevs.in/lab", EMAIL.p, EMAIL.f, EMAIL.t);
    const fragment = href.slice(href.indexOf("#"));

    expect(fragment).not.toContain("%0A");
    expect(fragment).not.toContain("%40");
    expect(fragment).not.toContain("%2B");
    expect(fragment).not.toContain("%5B");
    expect(fragment).not.toContain("soporte");
    expect(fragment).toMatch(/^#s=[A-Za-z0-9~_-]+$/);
  });

  it("reemplaza el fragmento anterior en vez de añadirse", () => {

    const href = shareHref("https://example.com/lab#s=cm1234abcdefghijklmnop", "a", "g", "b");

    expect(href.match(/#/g)).toHaveLength(1);
    expect(href.startsWith("https://example.com/lab#s=")).toBe(true);
  });

  it("lo que genera se lee de vuelta igual", () => {
    const href = shareHref("https://example.com/lab", EMAIL.p, EMAIL.f, EMAIL.t);

    expect(readHash(href.slice(href.indexOf("#")))).toEqual({
      p: EMAIL.p,
      f: EMAIL.f,
      t: EMAIL.t,
    });
  });

  it("el enlace viejo y el nuevo abren el mismo laboratorio", () => {

    const long: SharedState = {
      p: "^\\s*(?:AVISO|REVISAR)\\s*:",
      f: "gi",
      t: Array.from({ length: 20 }, (_, i) => `Línea ${i}: texto repetido.`).join("\n"),
    };
    const oldForm = `#p=${encodeURIComponent(long.p)}&f=${long.f}&t=${encodeURIComponent(long.t)}`;
    const newForm = `#s=${encodeState(long)}`;

    expect(newForm.length).toBeLessThan(oldForm.length);
  });
});

describe("los limites del producto", () => {

  it("rechaza un patron mas largo que el maximo", () => {
    const token = encodeState({ p: "a".repeat(MAX_REGEX_LENGTH + 1), f: "g", t: "" });

    expect(decodeState(token)).toBeNull();
  });

  it("rechaza un texto mas largo que el maximo", () => {
    const token = encodeState({ p: "a", f: "g", t: "a".repeat(MAX_INPUT_LENGTH + 1) });

    expect(decodeState(token)).toBeNull();
  });

  it("acepta los valores justo en el limite", () => {
    const state = {
      p: "a".repeat(MAX_REGEX_LENGTH),
      f: "g",
      t: "a".repeat(MAX_INPUT_LENGTH),
    };

    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it("rechaza unas flags que no son validas", () => {
    const token = encodeState({ p: "a", f: "gz", t: "" });

    expect(decodeState(token)).toBeNull();
  });
});

describe("el enlace corto", () => {
  it("lleva el id y nada mas", () => {
    const href = shortHref("https://example.com/lab", "cm1234abcdefghijklmnop");

    expect(href).toBe("https://example.com/lab#s=cm1234abcdefghijklmnop");
  });

  it("descarta el fragmento anterior", () => {
    const href = shortHref("https://example.com/lab#s=cm1234abcdefghijklmnop", "cm9999");

    expect(href).toBe("https://example.com/lab#s=cm9999");
  });

  it("se lee como un id de patron", () => {
    expect(readHash("#s=cm1234abcdefghijklmnop")).toEqual({
      p: undefined,
      f: undefined,
      t: undefined,
      s: "cm1234abcdefghijklmnop",
    });
  });
});

function encodeStateAs(json: string): string {
  return `${SHARED_MARKER}${encodeURIComponent(json)}`;
}