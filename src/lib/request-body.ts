
export const MAX_API_BODY_BYTES = 256 * 1024;

export class BodyTooLargeError extends Error {
  constructor() {
    super("El cuerpo de la petición es demasiado grande");
    this.name = "BodyTooLargeError";
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const body = request.body;

  if (!body) {

    throw new SyntaxError("Unexpected end of JSON input");
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > MAX_API_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }

  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(buffer));
}
