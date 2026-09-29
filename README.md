# 🎙️ Aurel Voice Studio

> Professional broadcast-grade voice enhancement and acoustic tuning software designed from [`C:\Users\Aljon\Desktop\Design.html`](file:///C:/Users/Aljon/Desktop/Design.html). Runs offline on Windows with ultra-low latency (<5ms) Web Audio DSP, SQLite preset persistence, and direct virtual cable routing for Zoom, Teams, Discord, and OBS.

---

## 🚀 Tech Stack

- **Desktop Framework:** [Electron 44](https://www.electronjs.org/) (Custom frameless window, offline WASAPI audio streaming with background throttling disabled)
- **Frontend UI:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Design & Styling:** [Meta StyleX](https://stylexjs.com/) (`@stylexjs/stylex` with `@stylexjs/rollup-plugin` for compile-time zero-runtime CSS) + Geist & Geist Mono typography
- **Build Tool:** [Vite 8](https://vitejs.dev/)
- **Database:** [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (local persistent storage for custom acoustic presets and device preferences)
- **Audio DSP Engine:** Web Audio pipeline featuring clean digital pre-gain, 5-band parametric EQ, downward expander/noise gate, dynamics compressor, vocal de-esser, and brickwall peak limiter.

---

## ✨ Features Implemented from Design.html

1. **Studio (Home)**
   - Dual live voice waveform visualizer comparing raw mic vs Aurel enhanced output in real-time.
   - Output level meter with target broadcast bracket (−18.5 to −13.5 dB) and dynamic speech coaching ("On target for broadcast (−16)", "A little quiet. Raise Voice Boost", "Hot. Lower Voice Boost").
   - 5 Signature Sound Profiles: **Broadcast**, **Podcast**, **Clear Speech**, **Studio Condenser**, and **Natural** with active SVG frequency curves.
   - Quick Sliders: **Voice Boost** (clean pre-gain up to +38 dB), **Warmth** (160 Hz chest resonance), **Presence** (4.2 kHz speech clarity).
   - **Noise Cleanup** segmented selector: `Off`, `Light`, `Balanced`, and `Strong`.
   - Master **Enhancement On / Bypassed** switch and **Hear Self (Monitor)** headphone calibration.

2. **Profiles**
   - Factory profiles and custom user-created profiles with live EQ curve previews.
   - **Save as new profile** modal dialog writing directly to local SQLite database.
   - Delete, audition, and duplicate controls.

3. **Fine-tune & Mic Correction**
   - Interactive 5-Band Parametric EQ (HPF, Warmth 155Hz, De-Mud 360Hz, Presence 4.2kHz, Air Sheen 11kHz).
   - Dynamics Compressor controls (Threshold, Ratio, Attack, Release, Knee).
   - Vocal De-Esser for sibilance taming.
   - **Microphone Correction Models**: Compensates hardware capsules for Maono PD100, Shure SM7B, Blue Yeti, Elgato Wave:3, Rode Procaster, and Laptop microphones.

4. **Connect Apps**
   - Routing instructions and connection status for **Microsoft Teams**, **Discord**, **Zoom Workplace**, **OBS Studio**, **Google Meet**, and **Audacity / DAWs** via VB-Audio Virtual Cable.

5. **Settings**
   - Input device selector, virtual output device selector, and headphone monitoring device selector.
   - Audio buffer size selector (64 samples = 1.3ms, 128 samples = 2.6ms, 256 samples = 5.3ms).
   - Background audio throttling protection indicator.

6. **Test My Sound (Record & Compare)**
   - 6-second voice recording tool with instant switchable A/B comparison playback ("Raw Mic" vs "Aurel Enhanced").

7. **Voice Check Wizard**
   - 4-step first-run setup and microphone calibration wizard.

---

## 💻 Running Aurel Voice Studio

Open PowerShell in the workspace:

```powershell
cd C:\Users\Aljon\.gemini\antigravity\scratch\broadcast-mic-studio

# 1. Run Vite + Electron Development Mode
npm.cmd run dev

# 2. Or Build and Run Production Electron App
npm.cmd run build
npm.cmd start
```

---

## 🎧 Connecting to Discord, Zoom, Teams & OBS

1. In Aurel Voice Studio **Settings**, select your physical microphone as **Input Device**, and select **CABLE Input (VB-Audio Virtual Cable)** as **Output Device**.
2. In Zoom, Discord, Teams, or OBS, set your microphone to **CABLE Output (VB-Audio Virtual Cable)**.
3. Turn off built-in noise reduction inside Discord/Zoom so Aurel's studio processing handles the audio cleanly without double-filtering.
# broadcast-mic-studio
