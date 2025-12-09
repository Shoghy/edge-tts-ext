import { useEffect, useRef, useState, type JSX } from "react";
import type { Voice } from "@shoghy/edge-tts-js";
import "./App.css";
import { Err, Ok, type Result } from "rusting-js/enums";
import { catchUnwind } from "rusting-js";
import { server } from "@/server.ts";
import { type Messages } from "@/types.ts";

const decoder = new TextDecoder("utf-8", { fatal: true });

export function App(): JSX.Element {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>(
    localStorage.getItem("voice") ?? "en-US-EmmaMultilingualNeural",
  );
  const selectedVoiceRef = useRef(selectedVoice);
  selectedVoiceRef.current = selectedVoice;

  const audioRef = useRef<HTMLAudioElement>(null);

  async function getVoices(): Promise<void> {
    const response = await server.voices.$get();

    if (response.status !== 200) {
      console.error(await response.text());
      return;
    }

    const voicesResponse = await response.json();
    setVoices(voicesResponse);
    if (selectedVoice === "" && voicesResponse.length > 0) {
      setSelectedVoice(voicesResponse[0].Name);
    }
  }

  useEffect(() => {
    void getVoices();

    async function onMessage(msg: Messages): Promise<void> {
      console.log(msg);
      if (msg.type !== "ReadOutLoud" || audioRef.current === null) {
        return;
      }

      const response = await server["generate-audio"].$post({
        json: {
          text: msg.text,
          voice: selectedVoiceRef.current,
        },
      });

      if (response.status !== 200) {
        console.error(await response.text());
        return;
      }

      if (response.body === null) {
        return;
      }

      const mediaSource = new MediaSource();
      audioRef.current.src = URL.createObjectURL(mediaSource);

      const reader = response.body.getReader();

      mediaSource.addEventListener("sourceopen", async () => {
        const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (!sourceBuffer.updating) {
              mediaSource.endOfStream();
            } else {
              sourceBuffer.addEventListener(
                "updateend",
                () => mediaSource.endOfStream(),
                { once: true },
              );
            }
            break;
          }

          const isErrorResult = catchUnwind(() => {
            const message = decoder.decode(value);
            return message === "ERROR";
          });

          if (isErrorResult.isOk() && isErrorResult.unwrap()) {
            console.error("Server send an error response");
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
            return;
          }
        }
      });

      mediaSource.addEventListener("sourceended", () => {
        void audioRef.current?.play();
      });
    }

    chrome.runtime.onMessage.addListener(onMessage);

    return (): void => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return (
    <div>
      <select
        name="voice-selector"
        value={selectedVoice}
        onChange={async (event) => {
          const voice = event.currentTarget.value;
          setSelectedVoice(voice);
          localStorage.setItem("voice", voice);
        }}
      >
        {voices.map(({ LocalName, Name, Locale }) => (
          <option key={Name} value={Name}>{`(${Locale}) ${LocalName}`}</option>
        ))}
      </select>
      <audio ref={audioRef} controls />
    </div>
  );
}
