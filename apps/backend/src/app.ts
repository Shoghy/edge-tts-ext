import { Hono } from "hono";
import { Communicate, listVoices, type Voice } from "@shoghy/edge-tts-js";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { stream } from "hono/streaming";
import { cors } from "hono/cors";

let voices: Voice[] = [];

const encoder = new TextEncoder();

function createStreamResponse(
  headers: object,
  data: Uint8Array | object,
): Uint8Array {
  const byteData =
    data instanceof Uint8Array ? data : encoder.encode(JSON.stringify(data));

  const byteHeader = encoder.encode(
    JSON.stringify({ ...headers, bodyLength: byteData.length }),
  );
  if (byteHeader.length > 0xffff) {
    throw new Error("The header is too long");
  }

  const response = new Uint8Array(byteHeader.length + byteData.length + 2);
  const view = new DataView(response.buffer);
  view.setUint16(0, byteHeader.length);

  response.set(byteHeader, 2);
  response.set(byteData, byteHeader.length + 2);

  return response;
}

export const app = new Hono()
  .use(cors())
  .get("/health", (c) => c.text("Hello World!"))
  .get("/voices", async (c) => {
    if (voices.length > 0) return c.json(voices);
    const result = await listVoices();

    if (result.isErr()) {
      const errors = result.unwrapErr();
      errors.match({
        FetchThrow(error) {
          console.error("FetchThrow:", error);
        },
        ReponseIsNotValidJSON(error) {
          console.error("ReponseIsNotValidJSON:", error);
        },
        UnknownReponse(error) {
          console.error("UnknownReponse:", error);
        },
      });
      c.status(424);
      return c.text("Unable to get voices");
    }

    voices = result.unwrap();
    return c.json(voices);
  })
  .post(
    "/generate-audio",
    zValidator(
      "json",
      z.strictObject({
        text: z.string().nonempty(),
        voice: z.string().nonempty(),
      }),
    ),
    async (c) => {
      const { text, voice } = c.req.valid("json");
      const communicate = new Communicate(text, voice, {
        boundary: "WordBoundary",
      });

      return stream(c, async (s) => {
        for await (const chunkResult of communicate.stream()) {
          if (s.aborted) return;
          if (chunkResult.isErr()) {
            const error = chunkResult.unwrapErr();
            console.error("CHUNK ERROR:", error);
            await s.write(
              createStreamResponse(
                { type: "error" },
                { message: "Unexpected error happened" },
              ),
            );
            return;
          }

          const chunk = chunkResult.unwrap();
          const parsedChunkData = chunk.match<Uint8Array>({
            Audio: ({ data }) => createStreamResponse({ type: "mp3" }, data),

            Sub: (value) =>
              createStreamResponse(
                { type: "subtitle" },
                {
                  ...value,
                  duration: value.duration / 1000000,
                  offset: value.offset / 1000000,
                },
              ),
          });

          await s.write(parsedChunkData);
        }
      });
    },
  );

export type AppRouter = typeof app;
