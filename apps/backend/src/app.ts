import { Hono } from "hono";
import { Communicate, listVoices, type Voice } from "@shoghy/edge-tts-js";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { stream } from "hono/streaming";
import { cors } from "hono/cors";

let voices: Voice[] = [];

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
      const communicate = new Communicate(text, voice);
      return stream(c, async (s) => {
        for await (const chunkResult of communicate.stream()) {
          if (chunkResult.isErr()) {
            const error = chunkResult.unwrapErr();
            console.error("CHUNK ERROR:", error);
            await s.write(Buffer.from("ERROR"));
            return;
          }

          const chunk = chunkResult.unwrap();
          if (chunk.is("Sub")) {
            continue;
          }

          const mp3Data = chunk.match<Uint8Array>({
            Audio: ({ data }) => data,
            Sub: () => {
              throw Error("This should never be executed");
            },
          });

          await s.write(mp3Data);
        }
      });
    },
  );

export type AppRouter = typeof app;
