import { useEffect, useRef, type JSX } from "react";
import { catchUnwind } from "rusting-js";
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
      const voice = await getVoice();
      const response = await server["generate-audio"].$post({
        json: {
          text,
          voice,
        },
      });

      const reader = response.body?.getReader();
      if (response.status !== 200 || reader === undefined) {
        return false;
      }

      const mediaSource = new MediaSource();
      audioRef.current.src = URL.createObjectURL(mediaSource);

      while (true) {
        if (stopPlay) {
          return false;
        }

        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const isError = catchUnwind(() => decoder.decode(value)).isOkAnd(
          (chunk) => chunk === "ERROR",
        );

        if (isError) {
          return false;
        }
      }

      return true;
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
