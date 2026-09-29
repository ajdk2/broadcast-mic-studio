<script type="text/x-dc" data-dc-script="" data-props="{&quot;$preview&quot;:{&quot;width&quot;:1920,&quot;height&quot;:1080}}">
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { profile: 'broadcast', on: true, view: 'enhanced', boost: 68, warmth: 62, presence: 48, noise: 'balanced', monitor: false };
  }
  renderVals() {
    const s = this.state;
    const fr = (x) => x - Math.floor(x);
    const sgn = (v, d) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d);
    const g = s.boost / 68;
    let inD = '';
    let outD = '';
    for (let i = 0; i < 140; i++) {
      const x = 4 + i * 8;
      const r = fr(Math.sin(i * 12.9898) * 43758.5453);
      const syl = Math.abs(Math.sin(i * 0.31));
      const phrase = Math.max(0, Math.sin(i * 0.058 + 0.5));
      const e = syl * phrase;
      const hin = 1.5 + 20 * e * (0.55 + 0.45 * r);
      let hout = hin;
      if (s.on) {
        hout = e > 0.07 ? Math.min(98, 6 + 88 * Math.pow(e * (0.75 + 0.25 * r), 0.5) * g) : 1.2;
      }
      inD += 'M' + x + ' ' + (110 - hin).toFixed(1) + 'V' + (110 + hin).toFixed(1);
      outD += 'M' + x + ' ' + (110 - hout).toFixed(1) + 'V' + (110 + hout).toFixed(1);
    }
    const gain = s.on ? s.boost * 0.38 : 0;
    const outL = -41.8 + gain;
    const meter = (v) => Math.max(4, Math.min(324, (60 + v) / 60 * 324));
    const W = 466;
    const slider = (v) => ({ w: W * v / 100, x: Math.max(9, Math.min(W - 9, W * v / 100)) });
    const b = slider(s.boost), wa = slider(s.warmth), pr = slider(s.presence);
    const noiseMap = { off: ['Off', 'Your room is passed through untouched.', '−48 dB'], light: ['Light', 'Takes the edge off steady hum and hiss. Most natural.', '−62 dB'], balanced: ['Balanced', 'Removes fans, keyboard clicks and room echo while keeping breaths natural.', '−74 dB'], strong: ['Strong', 'For loud rooms. Silences everything that is not your voice.', '−86 dB'] };
    const profiles = [
      { id: 'broadcast', name: 'Broadcast', desc: 'Deep, close and controlled. The late-night radio voice.', tags: 'Warm lows · Tight dynamics', curve: 'M0 30 C18 30 28 11 58 12 S108 25 140 25 S198 17 228 19 S254 27 260 29' },
      { id: 'podcast', name: 'Podcast', desc: 'Rich and even for long-form talk, interviews and narration.', tags: 'Full body · Smooth', curve: 'M0 33 C25 33 40 17 72 17 S120 23 150 22 S210 16 240 18 S258 25 260 27' },
      { id: 'clear', name: 'Clear Speech', desc: 'Crisp and intelligible. Tuned for meetings and calls.', tags: 'Low cut · Presence', curve: 'M0 39 C20 39 34 27 60 25 S120 23 150 21 S190 9 215 11 S250 21 260 25' },
      { id: 'condenser', name: 'Studio Condenser', desc: 'Open, airy detail with a polished top end.', tags: 'Air · Detail', curve: 'M0 34 C30 34 50 24 90 24 S150 25 180 21 S230 8 260 7' },
      { id: 'natural', name: 'Natural', desc: 'Light cleanup only. Still you, just clearer and louder.', tags: 'Transparent', curve: 'M0 29 C30 26 60 24 130 24 S230 24 260 25' }
    ].map((p) => ({ ...p, selected: s.profile === p.id, stroke: s.profile === p.id ? '#F5A623' : '#8C9098', pick: () => this.setState({ profile: p.id }) }));
    const views = [['original', 'Original'], ['enhanced', 'Enhanced']].map(([id, label]) => ({ label, selected: s.view === id, unselected: s.view !== id, pick: () => this.setState({ view: id }) }));
    const noiseOpts = ['off', 'light', 'balanced', 'strong'].map((id) => ({ label: noiseMap[id][0], selected: s.noise === id, unselected: s.noise !== id, pick: () => this.setState({ noise: id }) }));
    const nz = s.on ? noiseMap[s.noise] : noiseMap.off;
    const inTarget = s.on && outL > -18.5 && outL < -13.5;
    return {
      inD, outD,
      outOpacity: s.view === 'enhanced' ? 1 : 0.14,
      inStroke: s.view === 'enhanced' ? '#9EA1A8' : '#F3F2EF',
      on: s.on, off: !s.on,
      togglePower: () => this.setState({ on: !s.on }),
      monitor: s.monitor,
      monitorLabel: s.monitor ? 'Monitoring' : 'Monitor off',
      toggleMonitor: () => this.setState({ monitor: !s.monitor }),
      liveCaption: s.on ? 'Listening through the ' + profiles.find((p) => p.selected).name + ' profile' : 'Enhancement bypassed',
      outLabel: sgn(outL, 1).replace('+', ''),
      statusText: !s.on ? 'Raw mic level. Most listeners will struggle to hear you.' : inTarget ? 'On target for podcasts and broadcast (−16)' : (outL <= -18.5 ? 'A little quiet. Raise Voice Boost.' : 'Hot. Lower Voice Boost to avoid pumping.'),
      statusColor: !s.on ? '#FF8A7E' : inTarget ? '#43D18A' : '#FFC869',
      inW: meter(-41.8), outW: meter(outL),
      liftLabel: sgn(gain, 0) + ' dB',
      floorLabel: nz[2],
      profiles, views, noiseOpts,
      noiseHelp: noiseMap[s.noise][1],
      boost: s.boost, boostW: b.w, boostX: b.x, boostLabel: sgn(s.boost * 0.38, 0) + ' dB',
      onBoost: (e) => this.setState({ boost: Number(e.target.value) }),
      warmth: s.warmth, warmthW: wa.w, warmthX: wa.x, warmthLabel: sgn((s.warmth - 50) * 0.12, 1) + ' dB',
      onWarmth: (e) => this.setState({ warmth: Number(e.target.value) }),
      presence: s.presence, presenceW: pr.w, presenceX: pr.x, presenceLabel: sgn((s.presence - 50) * 0.12, 1) + ' dB',
      onPresence: (e) => this.setState({ presence: Number(e.target.value) })
    };
  }
}
</script>