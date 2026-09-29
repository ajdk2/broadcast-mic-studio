# 🎙️ Aurel Voice Studio

> Broadcast-grade voice enhancement for Windows. Aurel cleans up and lifts your microphone in real time, fully offline, and sends the result to Zoom, Teams, Discord, OBS and other apps through VB-Audio Virtual Cable.

The design lives in the Aurel canvas (29 boards: Studio, setup, Fine-tune, Profiles, Connect apps, Settings, tray, notifications, error states, light theme and a 2560 × 1440 layout).

---

## 🚀 Tech stack

- **Desktop:** [Electron 44](https://www.electronjs.org/): frameless window, tray icon and quick panel, global shortcuts, notification pop-ups. Background throttling is off so audio keeps running while Aurel sits in the tray.
- **UI:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/). Styling uses the design system's tokens as CSS variables (`src/index.css`), with dark, light and Match Windows themes. Geist and Geist Mono are bundled, so no internet is needed.
- **Build:** [Vite 8](https://vitejs.dev/); tests with [Vitest](https://vitest.dev/).
- **Storage:** SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) in the user data folder (`aurel.db`): profiles and settings, stored whole as JSON.
- **Audio:** Web Audio with AudioWorklet processors (`src/audio`). The DSP is plain TypeScript in `src/audio/dsp`, unit-tested without a browser.

## 🔊 Voice chain

In the order the design specifies (Fine-tune › Voice chain):

1. **Noise removal:** spectral (STFT) noise reduction with a learned noise floor, a "keep breaths natural" floor and room-echo suppression.
2. **Mic correction:** three bands (body, boxiness, harshness) measured from the voice check. It belongs to the microphone, so every profile benefits.
3. **Rumble filter:** 18 dB/oct high-pass.
4. **Pop removal** and **mouth-click removal**, with a 1.5 ms lookahead.
5. **Equalizer:** body shelf, mud, presence, air, plus the Studio Warmth/Presence sliders.
6. **Compressor**, then **analog warmth** (tape, tube or console saturation).
7. **De-esser:** dynamic, only turns down sibilance.
8. **Voice Boost & leveler:** clean gain after noise removal, plus an optional ±6 dB leveler aiming at a LUFS target.
9. **Limiter:** lookahead brickwall at the ceiling.

Meters use ITU-R BS.1770 loudness (LUFS) and 4× oversampled true peak.

## ✨ Screens

- **Studio:** live raw vs. enhanced waveform, output loudness with on-target coaching, profiles, Voice Boost, noise removal, tone. Shows banners when the mic is unplugged or clipping.
- **Fine-tune:** every stage above, with its own on/off switch. Draggable EQ with a live spectrum (scroll a point to change its width), the mic-correction panel, and Reset / Update / Save as new profile.
- **Profiles:** built-in and your own profiles. Use, rename, duplicate, export and import `.aurel` files, reset to original, delete. Ctrl + Alt + number shortcuts, and rules that switch profile when an app opens.
- **Connect apps:** VB-Cable status, which apps are open or using a mic right now, and step-by-step setup per app.
- **Settings:** start with Windows, start in tray, close to tray, disconnect alerts, devices, sample rate, latency, processing quality, theme, global shortcuts (mute, hold to hear original, next profile, push to talk), install update from file.
- **Setup:** choose mic (live levels for every mic), 10-second voice check with measured loudness, room noise and mic correction, hear your own voice through each profile, connect apps. Also a first-time tour of Studio.
- **Test my sound:** record 10 s, then switch between original and enhanced, or any profile, while it plays.

## 💻 Running Aurel

```powershell
npm ci
npm run rebuild:native   # builds better-sqlite3 for Electron (needs internet once)

npm run dev              # Vite + Electron with hot reload
npm run build            # type-check, bundle UI, compile main process
npm start                # run the built app
npm test                 # DSP and analysis tests
```

`npm run dev:vite` runs the UI alone in a browser. Profiles and settings then go to local storage, and Windows-only features (tray, global shortcuts, app status) are off.

## 🎧 Connecting to Discord, Zoom, Teams & OBS

1. Install the free [VB-Audio Virtual Cable](https://vb-audio.com/Cable/) (run the installer as administrator, then restart).
2. In Aurel's **Settings › Audio engine**, pick your physical microphone under **Microphone**. **Send my voice to** selects **CABLE Input (VB-Audio Virtual Cable)** automatically once the cable is installed.
3. In Zoom, Discord, Teams or OBS, set your microphone to **CABLE Output (VB-Audio Virtual Cable)**.
4. Turn off the app's own noise suppression and automatic volume so it doesn't double up with Aurel's processing.
