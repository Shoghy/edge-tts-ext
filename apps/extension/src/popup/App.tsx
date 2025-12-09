import { useEffect, useRef, useState, type JSX } from "react";
import type { Voice } from "@shoghy/edge-tts-js";
import "./App.css";
import { getVoice, server, setVoice } from "@/utils.ts";

export function App(): JSX.Element {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
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
  }

  async function getCurrentVoice(): Promise<void> {
    setSelectedVoice(await getVoice());
  }

  useEffect(() => {
    void getCurrentVoice();
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
          void setVoice(voice);
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
