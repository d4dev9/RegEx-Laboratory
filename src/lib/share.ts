import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

import {
  ALLOWED_FLAGS,
  MAX_INPUT_LENGTH,
  MAX_REGEX_LENGTH,
} from "@/lib/regex/limits";

export interface SharedState {

  p: string;

  f: string;

  t: string;
}

export const SHARED_MARKER = "~";

export function isSharedState(value: string): boolean {
  return value.startsWith(SHARED_MARKER);
}

export function encodeState(state: SharedState): string {
  const compressed = compressToEncodedURIComponent(JSON.stringify(state));

  return SHARED_MARKER + compressed.replace(/\+/g, "_");
}

export function decodeState(token: string): SharedState | null {
  if (!isSharedState(token)) return null;

  let json: string | null;
  try {

    const payload = token.slice(SHARED_MARKER.length).replace(/_/g, "+");
    json = decompressFromEncodedURIComponent(payload);
  } catch {
    return null;
  }
  if (!json) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as SharedState).p !== "string" ||
    typeof (parsed as SharedState).f !== "string" ||
    typeof (parsed as SharedState).t !== "string"
  ) {
    return null;
  }

  const state = parsed as SharedState;
  if (state.p.length > MAX_REGEX_LENGTH) return null;
  if (state.t.length > MAX_INPUT_LENGTH) return null;
  if (state.f.length > 8) return null;
  if (!new RegExp(`^[${ALLOWED_FLAGS}]*$`).test(state.f)) return null;

  return {
    p: state.p,
    f: state.f,
    t: state.t,
  };
}

export function shareHref(
  base: string,
  source: string,
  flags: string,
  text: string
): string {
  const token = encodeState({ p: source, f: flags, t: text });
  return `${base.split("#")[0]}#s=${token}`;
}

export function shortHref(base: string, id: string): string {
  return `${base.split("#")[0]}#s=${id}`;
}

export interface LabHash {

  p?: string;

  f?: string;

  t?: string;

  s?: string;
}

function rawParam(raw: string, key: string): string | undefined {
  for (const pair of raw.split("&")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;

    if (pair.slice(0, eq) === key) return pair.slice(eq + 1);
  }
  return undefined;
}

export function readHash(hash: string): LabHash {
  const raw = hash.replace(/^#/, "");
  const params = new URLSearchParams(raw);
  const s = rawParam(raw, "s");

  if (s !== undefined && isSharedState(s)) {
    const shared = decodeState(s);

    if (shared) return shared;
    return {};
  }

  return {
    p: params.get("p") ?? undefined,
    f: params.get("f") ?? undefined,
    t: params.get("t") ?? undefined,

    ...(s !== undefined ? { s } : {}),
  };
}