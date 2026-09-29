<script type="text/x-dc" data-dc-script="" data-props="{&quot;$preview&quot;:{&quot;width&quot;:1920,&quot;height&quot;:1080}}">
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { app: 'discord' };
  }
  renderVals() {
    const A = [
      { id: 'teams', mono: 'Te', name: 'Microsoft Teams', sub: 'Live now · in a meeting', live: true, device: 'Aurel Microphone', st: 'ok', path: 'Open Teams, then Settings › Devices.' },
      { id: 'obs', mono: 'Ob', name: 'OBS Studio', sub: 'Live now · recording', live: true, device: 'Aurel Microphone', st: 'ok', path: 'Open OBS, then Settings › Audio.' },
      { id: 'zoom', mono: 'Zo', name: 'Zoom Workplace', sub: 'Follows Windows default', live: false, device: 'Aurel Microphone', st: 'ok', path: 'Open Zoom, then Settings › Audio.' },
      { id: 'discord', mono: 'Di', name: 'Discord', sub: 'Set to a specific mic', live: false, device: 'USB Microphone (unprocessed)', st: 'warn', path: 'Open Discord, then User Settings › Voice & Video.' },
      { id: 'chrome', mono: 'Ch', name: 'Google Chrome', sub: 'Meet and other web apps', live: false, device: 'Aurel Microphone', st: 'ok', path: 'In Chrome, open Settings › Privacy › Site settings › Microphone.' },
      { id: 'audacity', mono: 'Au', name: 'Audacity', sub: 'Not opened since setup', live: false, device: 'Follows Windows default', st: 'idle', path: 'Open Audacity, then Audio Setup › Recording Device.' }
    ];
    const cur = A.find((a) => a.id === this.state.app) || A[3];
    const apps = A.map((a) => ({ ...a, ok: a.st === 'ok', warn: a.st === 'warn', idle: a.st === 'idle', selected: a.id === cur.id, pick: () => this.setState({ app: a.id }) }));
    const why = cur.st === 'warn' ? cur.name + ' is set to your microphone directly, so people hear the raw, quiet mic. It takes about 20 seconds to fix.' : cur.name + ' already hears your enhanced voice. If you ever pick a specific mic in it, choose Aurel Microphone.';
    return { apps, guideName: cur.name, guideWhy: why, step1: cur.path, eyebrow: cur.st === 'warn' ? 'Needs one change' : 'Already connected', eyebrowColor: cur.st === 'warn' ? '#FFC869' : '#6BE3A4' };
  }
}
</script>