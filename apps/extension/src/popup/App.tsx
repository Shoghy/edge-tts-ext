import { useEffect, useState, type JSX } from "react";
import type { Voice } from "@shoghy/edge-tts-js";
import "./App.css";
import { server } from "@/server.ts";

export function App(): JSX.Element {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>(
    localStorage.getItem("voice") ?? "en-US-EmmaMultilingualNeural",
  );

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

          await chrome.runtime.sendMessage({
            type: "SET_SELECTED_VOICE",
            voice,
          });
        }}
      >
        {voices.map(({ LocalName, Name, Locale }) => (
          <option key={Name} value={Name}>{`(${Locale}) ${LocalName}`}</option>
        ))}
      </select>
    </div>
  );
}
