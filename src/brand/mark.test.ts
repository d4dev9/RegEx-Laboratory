import { describe, expect, it } from "vitest";

import mark from "./mark.json";

const { colors, glyph, tiers } = mark;

const BLEED = Math.max(...tiers.map((tier) => tier.stroke)) / 2;

describe("la paleta es la del concepto", () => {
  it("son los cuatro colores definidos", () => {
    expect(colors).toEqual({
      tile: "#090d16",
      paren: "#6366f1",
      dot: "#a855f7",
      star: "#38bdf8",
    });
  });

  it("son colores completos, no nombres", () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("los tres glifos son distinguibles entre si", () => {

    const glyphColours = new Set([colors.paren, colors.dot, colors.star]);
    expect(glyphColours.size).toBe(3);
  });
});

describe("todos los glifos caen dentro de la caja", () => {
  it("la caja es mas ancha que alta, como cuatro caracteres de igual avance", () => {

    expect(glyph.width).toBeGreaterThan(glyph.height);
    expect(glyph.width / glyph.height).toBeGreaterThan(1.4);
  });

  it("los parentesis quedan dentro", () => {
    for (const paren of [glyph.open, glyph.close]) {
      expect(paren.topX - BLEED).toBeGreaterThanOrEqual(0);
      expect(paren.bulgeX - BLEED).toBeGreaterThanOrEqual(0);
      expect(paren.topX + BLEED).toBeLessThanOrEqual(glyph.width);
      expect(paren.bulgeX + BLEED).toBeLessThanOrEqual(glyph.width);
      expect(paren.topY - BLEED).toBeGreaterThanOrEqual(0);
      expect(paren.bottomY + BLEED).toBeLessThanOrEqual(glyph.height);
    }
  });

  it("el parentesis que abre abomba a la izquierda y el que cierra a la derecha", () => {
    expect(glyph.open.bulgeX).toBeLessThan(glyph.open.topX);
    expect(glyph.close.bulgeX).toBeGreaterThan(glyph.close.topX);
  });

  it("el punto y el asterisco quedan dentro", () => {
    const dotR = glyph.dot.r * Math.max(...tiers.map((t) => t.dotScale));
    expect(glyph.dot.cx - dotR).toBeGreaterThanOrEqual(0);
    expect(glyph.dot.cx + dotR).toBeLessThanOrEqual(glyph.width);
    expect(glyph.dot.cy - dotR).toBeGreaterThanOrEqual(0);
    expect(glyph.dot.cy + dotR).toBeLessThanOrEqual(glyph.height);

    const starR =
      glyph.star.r *
      Math.max(...tiers.map((t) => t.starScale)) +
      Math.max(...tiers.map((t) => t.stroke));
    expect(glyph.star.cx - starR).toBeGreaterThanOrEqual(0);
    expect(glyph.star.cx + starR).toBeLessThanOrEqual(glyph.width);
    expect(glyph.star.cy - starR).toBeGreaterThanOrEqual(0);
    expect(glyph.star.cy + starR).toBeLessThanOrEqual(glyph.height);
  });
});

describe("los cuatro caracteres no se pisan", () => {
  it("el punto queda entre los dos parentes", () => {
    expect(glyph.dot.cx).toBeGreaterThan(glyph.open.topX);
    expect(glyph.dot.cx).toBeLessThan(glyph.close.topX);
  });

  it("el punto y el asterisco no se solapan", () => {
    const dotR = glyph.dot.r * Math.max(...tiers.map((t) => t.dotScale));
    const starR = glyph.star.r * Math.max(...tiers.map((t) => t.starScale));

    expect(glyph.star.cx - starR).toBeGreaterThan(glyph.dot.cx + dotR);
  });

  it("el asterisco queda por encima del punto, como en un tipo de verdad", () => {
    expect(glyph.star.cy).toBeLessThan(glyph.dot.cy);
  });
});

describe("los tramos cubren todos los tamanos que se generan", () => {
  it("estan ordenados y sin huecos", () => {
    for (let i = 1; i < tiers.length; i += 1) {
      expect(tiers[i].maxSize).toBeGreaterThan(tiers[i - 1].maxSize);
    }

    expect(tiers[tiers.length - 1].maxSize).toBeGreaterThanOrEqual(512);
  });

  it("cada tamano generado resuelve a un tramo", () => {
    for (const size of [16, 32, 48, 180, 192, 512]) {
      expect(tiers.some((tier) => size <= tier.maxSize)).toBe(true);
    }
  });
});

describe("el trazo se adapta al tamano", () => {
  it("los tamanos pequenos llevan mas trazo relativo", () => {

    const weights = [512, 192, 48, 32, 16].map((size) => {
      const tier = tiers.find((t) => size <= t.maxSize) ?? tiers[tiers.length - 1];
      const box = size - 2 * size * tier.padding;
      return { size, weight: (tier.stroke * (box / glyph.width)) / size };
    });

    for (let i = 1; i < weights.length; i += 1) {
      expect(
        weights[i].weight,
        weights[i].size + "px frente a " + weights[i - 1].size + "px",
      ).toBeGreaterThanOrEqual(weights[i - 1].weight);
    }

    expect(weights[weights.length - 1].weight).toBeGreaterThan(
      weights[0].weight * 1.5,
    );
  });

  it("a 16px el trazo sigue siendo de al menos un pixel", () => {
    const tier = tiers.find((t) => 16 <= t.maxSize)!;
    const box = 16 - 2 * 16 * tier.padding;
    expect(tier.stroke * (box / glyph.width)).toBeGreaterThanOrEqual(1);
  });

  it("el asterisco pierde un brazo en vez de emborronarse", () => {

    const small = tiers.find((t) => 16 <= t.maxSize)!;
    const large = tiers[tiers.length - 1];
    expect(small.starArms).toBe(4);
    expect(large.starArms).toBe(5);
  });

  it("el margen del tile no se come el dibujo", () => {
    for (const tier of tiers) {
      expect(tier.padding).toBeGreaterThan(0);
      expect(tier.padding).toBeLessThan(0.1);
    }
  });
});