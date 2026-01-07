import { useEffect, useRef, useState, type JSX } from "react";
import { catchUnwindAsync, promiseWithResolvers } from "rusting-js";
import { Err, Ok, type Result } from "rusting-js/enums";
import { type TTSChunk } from "@shoghy/edge-tts-js";
import { registerMessageListener, sendTo } from "@/events.ts";
import { getVoice, server, type Tab } from "@/utils.ts";

const decoder = new TextDecoder("utf-8", { fatal: true });

interface Header {
  type: "mp3" | "subtitle" | "error";
  bodyLength: number;
}

export function App(): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [_subtitles, setSubtitles] = useState<TTSChunk[]>([]);

  useEffect(() => {
    let stopPlay = false;
    let goBack: Tab | undefined = undefined;

    async function play(text: string): Promise<boolean> {
      if (audioRef.current === null) {
        return false;
      }

      stopPlay = false;
      audioRef.current.pause();
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
      const currentURL = URL.createObjectURL(mediaSource);
      audioRef.current.src = currentURL;

      const promise = promiseWithResolvers<boolean>();

      function stopSource(success: boolean): void {
        void catchUnwindAsync(() =>
          reader !== undefined ? reader.cancel() : Promise.resolve(),
        );
        mediaSource.endOfStream();
        promise.resolve(success);
      }

      mediaSource.addEventListener("sourceopen", async () => {
        setSubtitles([]);
        const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");

        let readData = new Uint8Array();
        let header: null | Header = null;
        let headerLength = 0;
        while (true) {
          if (stopPlay) {
            stopSource(true);
            return;
          }

          const read = await reader.read();
          if (audioRef.current?.src !== currentURL) {
            await reader.cancel();
            stopSource(true);
            return;
          }

          if (!read.done) {
            const newData = read.value as Uint8Array;
            const temp = new Uint8Array(readData.length + newData.length);
            temp.set(readData);
            temp.set(newData, readData.length);
            readData = temp;
          } else if (readData.length === 0) {
            if (header !== null) {
              console.log("Ended with pending header");
              stopSource(false);
            } else {
              stopSource(true);
            }
            return;
          }

          if (headerLength === 0) {
            const view = new DataView(readData.buffer);
            headerLength = view.getUint16(0);
            readData = readData.slice(2);
          }

          if (header === null) {
            if (readData.length < headerLength) {
              continue;
            }
            header = JSON.parse(
              decoder.decode(readData.slice(0, headerLength)),
            );

            readData = readData.slice(headerLength);
          }

          if (header!.type === "error") {
            stopSource(false);
            return;
          }

          if (readData.length < header!.bodyLength) {
            continue;
          }

          if (header!.type === "subtitle") {
            const ttsChunk = JSON.parse(
              decoder.decode(readData.slice(0, header!.bodyLength)),
            );
            setSubtitles((c) => [...c, ttsChunk]);

            readData = readData.slice(header!.bodyLength);
            header = null;
            headerLength = 0;
            continue;
          }

          const value = readData.slice(0, header!.bodyLength);

          readData = readData.slice(header!.bodyLength);
          header = null;
          headerLength = 0;

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
            stopSource(false);
            return;
          }

          if (audioRef.current?.paused ?? false) {
            void audioRef.current?.play();
            if (goBack !== undefined && goBack !== null) {
              void chrome.tabs.update(goBack.id!, { active: true });
              goBack = undefined;
            }
          }
        }
      });

      return await promise.promise;
    }

    const unsubscribe = registerMessageListener("player", {
      goBack(tab) {
        goBack = tab;
        return true;
      },
      stop() {
        audioRef.current?.pause();
        stopPlay = true;
        return true;
      },

      play,
    });

    void sendTo("contextMenu", { method: "playerReady" });

    return (): void => {
      unsubscribe();
    };
  }, []);

  return <audio controls ref={audioRef} />;
}
