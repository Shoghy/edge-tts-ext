import { useEffect, useRef, type JSX } from "react";
import { catchUnwind, promiseWithResolvers } from "rusting-js";
import { Err, Ok, type Result } from "rusting-js/enums";
import { registerMessageListener } from "@/events.ts";
import { getVoice, server } from "@/utils.ts";

const decoder = new TextDecoder("utf-8", { fatal: true });

export function App(): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let stopPlay = false;
    async function play(text: string): Promise<boolean> {
      if (audioRef.current === null) {
        return false;
      }

      stopPlay = false;
      const response = await server["generate-audio"].$post({
        json: {
          text,
          voice: await getVoice(),
        },
      });

      const reader = response.body?.getReader();
      if (response.status !== 200 || reader === undefined) {
        return false;
      }

      const mediaSource = new MediaSource();
      audioRef.current.src = URL.createObjectURL(mediaSource);

      const promise = promiseWithResolvers<boolean>();
      mediaSource.addEventListener("sourceopen", async () => {
        const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");

        while (true) {
          if (stopPlay) {
            mediaSource.endOfStream();
            promise.resolve(false);
            return;
          }

          const { done, value } = await reader.read();
          if (done) {
            mediaSource.endOfStream();
            promise.resolve(true);
            return;
          }

          const isError = catchUnwind(() => decoder.decode(value)).isOkAnd(
            (chunk) => chunk === "ERROR",
          );

          if (isError) {
            mediaSource.endOfStream();
            promise.resolve(false);
            return;
          }

          const result = await new Promise<Result<void, Event>>((resolve) => {
            sourceBuffer.addEventListener("updateend", () => resolve(Ok()), {
              once: true,
            });
            sourceBuffer.addEventListener(
              "error",
              (error) => resolve(Err(error)),
              {
                once: true,
              },
            );
            sourceBuffer.appendBuffer(value);
          });

          if (result.isErr()) {
            console.error(result.unwrapErr());
            mediaSource.endOfStream();
            promise.resolve(false);
            return;
          }
        }
      });

      mediaSource.addEventListener("sourceended", () => {
        if (!shouldPlay) return;
        void audioRef.current?.play();
      });

      const shouldPlay = await promise.promise;
      return shouldPlay;
    }

    const unsubscribe = registerMessageListener("player", {
      stop() {
        audioRef.current?.pause();
        stopPlay = true;
        return true;
      },

      play,
    });

    return (): void => {
      unsubscribe();
    };
  }, []);

  return <audio controls ref={audioRef} />;
}
