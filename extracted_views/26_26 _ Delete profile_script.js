<script type="text/x-dc" data-dc-script="" data-props="{&quot;$preview&quot;:{&quot;width&quot;:1920,&quot;height&quot;:1080}}">
class Component extends DCLogic {
  constructor(props) { super(props); this.state = { sel: 'stream', active: 'broadcast' }; }
  renderVals() {
    const st = this.state;
    const C = {
      broadcast: 'M0 30 C18 30 28 11 58 12 S108 25 140 25 S198 17 228 19 S254 27 260 29',
      podcast: 'M0 33 C25 33 40 17 72 17 S120 23 150 22 S210 16 240 18 S258 25 260 27',
      clear: 'M0 39 C20 39 34 27 60 25 S120 23 150 21 S190 9 215 11 S250 21 260 25',
      condenser: 'M0 34 C30 34 50 24 90 24 S150 25 180 21 S230 8 260 7',
      natural: 'M0 29 C30 26 60 24 130 24 S230 24 260 25',
      stream: 'M0 28 C16 28 26 8 56 9 S106 26 138 26 S196 16 226 17 S254 25 260 27',
      standup: 'M0 39 C20 39 36 29 62 27 S122 24 152 22 S192 12 216 13 S250 22 260 25'
    };
    const stat = (a) => a.map(([k, v]) => ({ k, v }));
    const P = [
      { id: 'stream', custom: true, name: 'Late-night stream', sub: 'From Broadcast · Ctrl Alt 1', meta: 'Based on Broadcast · Edited 2 days ago', key: '1', rule: 'When OBS Studio starts streaming or recording', ruleOn: true, stats: stat([['Voice Boost', '+30 dB'], ['Noise removal', 'Strong'], ['Warmth', '+3.6 dB'], ['Presence', '+1.2 dB'], ['Compressor', '4 : 1'], ['De-esser', '−5 dB'], ['Target', '−14 LUFS'], ['Analog warmth', 'Tape · 18%']]) },
      { id: 'standup', custom: true, name: 'Morning standup', sub: 'From Clear Speech · Ctrl Alt 2', meta: 'Based on Clear Speech · Edited last week', key: '2', rule: 'When Microsoft Teams joins a meeting', ruleOn: true, stats: stat([['Voice Boost', '+24 dB'], ['Noise removal', 'Balanced'], ['Warmth', '−0.6 dB'], ['Presence', '+3.0 dB'], ['Compressor', '3 : 1'], ['De-esser', '−4 dB'], ['Target', '−16 LUFS'], ['Analog warmth', 'Tape · 18%']]) },
      { id: 'broadcast', name: 'Broadcast', sub: 'Deep and controlled · Ctrl Alt 3', key: '3' },
      { id: 'podcast', name: 'Podcast', sub: 'Rich and even · Ctrl Alt 4', key: '4' },
      { id: 'clear', name: 'Clear Speech', sub: 'Crisp for meetings · Ctrl Alt 5', key: '5' },
      { id: 'condenser', name: 'Studio Condenser', sub: 'Airy and detailed · Ctrl Alt 6', key: '6' },
      { id: 'natural', name: 'Natural', sub: 'Light cleanup · Ctrl Alt 7', key: '7' }
    ];
    const defStats = stat([['Voice Boost', '+26 dB'], ['Noise removal', 'Balanced'], ['Warmth', '+1.4 dB'], ['Presence', '−0.2 dB'], ['Compressor', '3 : 1'], ['De-esser', '−4 dB'], ['Target', '−16 LUFS'], ['Analog warmth', 'Tape · 18%']]);
    const all = P.map((p) => ({ ...p, curve: C[p.id], selected: st.sel === p.id, current: st.sel === p.id ? 'true' : 'false', inUse: st.active === p.id, stroke: st.sel === p.id ? '#F5A623' : '#8C9098', pick: () => this.setState({ sel: p.id }) }));
    const s0 = all.find((p) => p.selected);
    const on = !!s0.ruleOn;
    const sel = { ...s0, builtIn: !s0.custom, custom: !!s0.custom, notInUse: !s0.inUse,
      meta: s0.meta || 'Built in · Your Voice Boost is kept when you switch',
      stats: s0.stats || defStats,
      rule: s0.rule || 'No rules yet. Add one to switch when an app starts.',
      ruleOn: on ? 'true' : 'false', ruleBg: on ? '#F5A623' : '#666A73', ruleJustify: on ? 'flex-end' : 'flex-start', ruleKnob: on ? '#1B1204' : '#B9BBC1' };
    return { mine: all.filter((p) => p.custom), builtin: all.filter((p) => !p.custom), sel, useSel: () => this.setState({ active: st.sel }) };
  }
}
</script>