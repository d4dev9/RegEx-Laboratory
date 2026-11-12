import type { SupportedLanguage } from "@/lib/regex/exporter";

export type Visibility = "private" | "public";

export interface StoredPattern {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  tags: string[];
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;

  sharedText?: string | null;
}

interface ApiPattern {
  id: string;
  name: string;
  regex: string;
  flags: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  sharedText?: string | null;
  user?: { name?: string | null } | null;
}

export interface PatternInput {

  id?: string;
  name: string;
  pattern: string;
  flags: string;
  tags: string[];
  visibility: Visibility;

  sharedText?: string | null;
}

interface PublicPattern {
  id: string;
  name: string;
  regex: string;
  flags: string;
  tags: string[];
  sharedText: string | null;
  author: string | null;
}

function toView(p: ApiPattern): StoredPattern {
  return {
    id: p.id,
    name: p.name,
    pattern: p.regex,
    flags: p.flags,
    tags: p.tags,
    visibility: p.isPublic ? "public" : "private",
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    sharedText: p.sharedText ?? null,
  };
}

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: number,

    readonly code?: string
  ) {
    super(message);
    this.name = "StoreError";
  }
}

async function fail(response: Response): Promise<never> {
  let message = `Error ${response.status}`;
  let code: string | undefined;
  try {
    const payload = await response.json();
    if (payload?.error) message = String(payload.error);
    else if (payload?.detail) message = String(payload.detail);
    if (payload?.code) code = String(payload.code);
  } catch {

  }
  throw new StoreError(message, response.status, code);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,

      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (e) {
    throw new StoreError(
      e instanceof Error ? e.message : "No se pudo contactar con el servidor",
      0
    );
  }
  if (!response.ok) return fail(response);
  return (await response.json()) as T;
}

export const store = {

  async list(): Promise<StoredPattern[]> {
    const payload = await request<{ patterns: ApiPattern[] }>(
      "/api/patterns?limit=100"
    );
    return payload.patterns.map(toView);
  },

  async get(id: string): Promise<StoredPattern | null> {
    try {
      return toView(await request<ApiPattern>(`/api/patterns/${id}`));
    } catch (e) {

      if (e instanceof StoreError && (e.status === 404 || e.status === 403)) {
        return null;
      }
      throw e;
    }
  },

  async getPublic(
    id: string
  ): Promise<(StoredPattern & { author?: string | null }) | null> {
    try {
      const p = await request<PublicPattern>(`/api/public/patterns/${id}`);
      return {
        id: p.id,
        name: p.name,
        pattern: p.regex,
        flags: p.flags,
        tags: p.tags,
        visibility: "public",
        createdAt: "",
        updatedAt: "",
        sharedText: p.sharedText ?? null,
        author: p.author ?? undefined,
      };
    } catch (e) {

      if (e instanceof StoreError && (e.status === 404 || e.status === 403)) {
        return null;
      }
      throw e;
    }
  },

  async save(input: PatternInput): Promise<StoredPattern> {
    const body = {
      name: input.name,
      regex: input.pattern,
      flags: input.flags,
      tags: input.tags,
      isPublic: input.visibility === "public",
      language: "javascript" as SupportedLanguage,

      sharedText: input.visibility === "public" ? (input.sharedText ?? null) : null,
    };

    if (input.id) {
      return toView(
        await request<ApiPattern>(`/api/patterns/${input.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      );
    }
    return toView(
      await request<ApiPattern>("/api/patterns", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );
  },

  async remove(id: string): Promise<void> {
    await request<{ success: boolean }>(`/api/patterns/${id}`, {
      method: "DELETE",
    });
  },

  async deleteAccount(): Promise<void> {
    await request<{ success: boolean }>("/api/account", { method: "DELETE" });
  },
};

export type Store = typeof store;
