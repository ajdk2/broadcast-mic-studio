<script type="text/x-dc" data-dc-script="" data-props="{&quot;$preview&quot;:{&quot;width&quot;:1920,&quot;height&quot;:1080}}">
class Component extends DCLogic {
  renderVals() {
    const N = 72, step = 18, w = 14, top = 14, h = 30;
    const lit = 22;
    let onD = '', offD = '';
    for (let i = 0; i < N; i++) {
      const x = i * step;
      const seg = 'M' + x + ' ' + top + 'h' + w + 'v' + h + 'h-' + w + 'z';
      if (i < lit) onD += seg; else offD += seg;
    }
    const zs = 36 * step, ze = 48 * step - 4;
    const zoneD = 'M' + zs + ' 8V2H' + ze + 'V8';
    return { onD, offD, zoneD, peakX: 28 * step };
  }
}
</script>