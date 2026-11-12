import { z } from "zod";
import {
  ALLOWED_FLAGS,
  MAX_FLAGS_LENGTH,
  MAX_INPUT_LENGTH,
  MAX_REGEX_LENGTH,
} from "@/lib/regex/limits";

export const flagsSchema = z
  .string()
  .max(MAX_FLAGS_LENGTH, "Demasiadas flags")
  .regex(new RegExp(`^[${ALLOWED_FLAGS}]*$`), "Flags inválidas");

const patternFields = {
  name: z.string().min(1, "El nombre es requerido").max(100),
  description: z.string().max(500).optional(),
  regex: z
    .string()
    .min(1, "La regex es requerida")
    .max(MAX_REGEX_LENGTH, `La regex no puede superar ${MAX_REGEX_LENGTH} caracteres`),
  flags: flagsSchema,
  language: z.enum([
    "javascript",
    "python",
    "go",
    "rust",
    "java",
    "csharp",
    "php",
    "ruby",
  ]),
  isPublic: z.boolean(),
  tags: z.array(z.string().max(50, "Etiqueta demasiado larga")).max(20, "Demasiadas etiquetas"),

  sharedText: z.string().max(MAX_INPUT_LENGTH, "El texto es demasiado largo").nullable().optional(),
};

export const patternSchema = z.object({
  ...patternFields,
  flags: flagsSchema.default("gm"),
  language: patternFields.language.default("javascript"),
  isPublic: z.boolean().default(false),
  tags: patternFields.tags.default([]),
});

export const testCaseSchema = z.object({
  patternId: z.cuid("patternId inválido"),
  input: z
    .string()
    .min(1, "El input de prueba es requerido")
    .max(MAX_INPUT_LENGTH, `El input no puede superar ${MAX_INPUT_LENGTH} caracteres`),
  expected: z.boolean(),
  description: z.string().max(200).optional(),
});

export const updatePatternSchema = z.object(patternFields).partial();

export const explainSchema = z.object({
  regex: z
    .string()
    .min(1, "La regex es requerida")
    .max(MAX_REGEX_LENGTH, `La regex no puede superar ${MAX_REGEX_LENGTH} caracteres`),
  flags: flagsSchema.default("gm"),
});

export type PatternInput = z.infer<typeof patternSchema>;
export type TestCaseInput = z.infer<typeof testCaseSchema>;
export type UpdatePatternInput = z.infer<typeof updatePatternSchema>;
export type ExplainInput = z.infer<typeof explainSchema>;

export function isZodError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "name" in error &&
    (error as { name?: string }).name === "ZodError"
  );
}

export function formatZodError(error: unknown): Record<string, string> {
  if (!isZodError(error)) return {};
  const zodError = error as unknown as {
    issues?: Array<{ path: (string | number)[]; message: string }>;
  };
  const out: Record<string, string> = {};
  for (const issue of zodError.issues ?? []) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}