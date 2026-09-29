<script type="text/x-dc" data-dc-script="" data-props="{&quot;$preview&quot;:{&quot;width&quot;:1920,&quot;height&quot;:1080}}">
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { mod: 'mic' };
  }
  renderVals() {
    const W = 836;
    const X = (f) => W * Math.log10(f / 20) / 3;
    const Y = (db) => 150 - db * 10;
    const l2 = (v) => Math.log(v) / Math.LN2;
    const resp = (f) => {
      const lf = l2(f);
      let db = -10 * Math.log10(1 + Math.pow(80 / f, 6));
      db += 3.5 / (1 + Math.pow(f / 120, 2));
      db += -3 * Math.exp(-Math.pow(lf - l2(300), 2) / (2 * 0.55 * 0.55));
      db += 3 * Math.exp(-Math.pow(lf - l2(3200), 2) / (2 * 0.7 * 0.7));
      db += 2.5 / (1 + Math.pow(10000 / f, 2));
      return db;
    };
    const pts = [];
    const spec = [];
    for (let i = 0; i <= 200; i++) {
      const f = 20 * Math.pow(10, 3 * i / 200);
      pts.push(X(f).toFixed(1) + ' ' + Math.max(2, Math.min(298, Y(resp(f)))).toFixed(1));
      const lf = l2(f);
      let s = -10 * Math.log10(1 + Math.pow(150 / f, 4)) - 7 * Math.max(0, lf - l2(700));
      s += 3 * Math.sin(i * 1.7) * Math.exp(-Math.abs(lf - l2(1500)) / 3);
      const h = Math.max(0, 120 + s * 3.2);
      spec.push(X(f).toFixed(1) + ' ' + (300 - h).toFixed(1));
    }
    const curveD = 'M' + pts.join(' L');
    const fillD = curveD + ' L' + W + ' 150 L0 150 Z';
    const specD = 'M0 300 L' + spec.join(' L') + ' L' + W + ' 300 Z';
    const B = [
      { n: 1, name: 'Rumble cut', type: 'High-pass', f: 80, freq: '80 Hz', gain: '18 dB/oct', q: '' },
      { n: 2, name: 'Body', type: 'Low shelf', f: 120, freq: '120 Hz', gain: '+3.5 dB', q: 'Q 0.7' },
      { n: 3, name: 'Mud', type: 'Bell', f: 300, freq: '300 Hz', gain: '−3.0 dB', q: 'Q 1.4' },
      { n: 4, name: 'Presence', type: 'Bell', f: 3200, freq: '3.2 kHz', gain: '+3.0 dB', q: 'Q 1.0' },
      { n: 5, name: 'Air', type: 'High shelf', f: 10000, freq: '10 kHz', gain: '+2.5 dB', q: 'Q 0.7' }
    ];
    const bands = B.map((b) => {
      const sel = b.n === 4;
      return { ...b, x: X(b.f).toFixed(1), y: Math.max(8, Math.min(292, Y(resp(b.f)))).toFixed(1), r: sel ? 9 : 7, fill: sel ? '#F5A623' : '#16181B', ring: sel ? '#F3F2EF' : '#F5A623', selected: sel };
    });
    const M = [
      ['nr', 'Noise removal', 'Balanced · floor \u221274 dB'],
      ['ai', 'AI Studio mode', 'Recordings only'],
      ['mic', 'Mic correction', 'Measured · 80%'],
      ['hp', 'Rumble filter', '80 Hz · 18 dB/oct'],
      ['pop', 'Pop removal', 'Auto'],
      ['click', 'Mouth-click removal', 'Light'],
      ['eq', 'Equalizer', '5 bands · Broadcast'],
      ['comp', 'Compressor', '3:1 · \u221224 dB'],
      ['warm', 'Analog warmth', 'Tape · 18%'],
      ['ds', 'De-esser', '6.5 kHz · \u22124 dB'],
      ['lv', 'Voice Boost & leveler', '+26 dB · auto'],
      ['lim', 'Limiter', 'Ceiling \u22121.0 dB']
    ];
    const modules = M.map(([id, name, sum], i) => ({ n: i + 1, name, sum, switchLabel: name + ' on', selected: this.state.mod === id, pick: () => this.setState({ mod: id }), link: id === 'mic' ? 'FineTuneMic.dc.html' : '' }));
    const comp = [['Threshold', '−24 dB'], ['Ratio', '3.0 : 1'], ['Attack', '8 ms'], ['Release', '120 ms']].map(([k, v]) => ({ k, v }));
    const nodesD = bands.filter((b) => !b.selected).map((b) => { const cx = Number(b.x), cy = Number(b.y), r = 7; return 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0'; }).join('');
    const bump = (f, c, w, g) => g * Math.exp(-Math.pow(l2(f) - l2(c), 2) / (2 * w * w));
    const mic = (f) => -4.2 / (1 + Math.pow(f / 180, 2)) + bump(f, 650, 0.6, 2.5) + bump(f, 4000, 0.45, 3) - 3.5 / (1 + Math.pow(11000 / f, 3));
    const Ym = (db) => 139 - db * 13.3;
    const mp = [], cp = [], rp = [];
    for (let i = 0; i <= 160; i++) {
      const f = 30 * Math.pow(10, Math.log10(16000 / 30) * i / 160);
      const m = mic(f), c = -0.8 * m, r = m + c;
      const x = X(f).toFixed(1);
      mp.push(x + ' ' + Ym(m).toFixed(1)); cp.push(x + ' ' + Ym(c).toFixed(1)); rp.push(x + ' ' + Ym(r).toFixed(1));
    }
    const micD = 'M' + mp.join(' L'), corrD = 'M' + cp.join(' L'), resD = 'M' + rp.join(' L');
    return { curveD, fillD, specD, bands, nodesD, modules, comp, micD, corrD, resD };
  }
}
</script>