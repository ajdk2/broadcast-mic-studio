import React from 'react';
import { useStudio } from '../state/store';
import { Icon } from '../ui/kit';

// Shown instead of the page when the audio engine can't start (board 14 · Mic locked by another app).
export function EngineProblem() {
  const s = useStudio();
  const err = s.status.error;
  const mic = s.inputLabel;
  const content =
    err === 'mic-locked'
      ? {
          icon: 'lock',
          badge: 'Input blocked by another app',
          title: 'Another app has locked your microphone',
          text: `An app took exclusive control of ${mic}, so Aurel can’t hear it. Your apps hear silence until this is fixed.`,
          steps: [
            `In Windows sound settings, open ${mic} › Properties › Advanced.`,
            'Turn off “Allow applications to take exclusive control of this device”.',
            'Come back here and choose Try again. The other app keeps working, through Aurel.',
          ],
        }
      : err === 'permission'
      ? {
          icon: 'shield',
          badge: 'Microphone access is off',
          title: 'Windows is keeping the mic from Aurel',
          text: 'Microphone access for desktop apps is turned off in Windows privacy settings, so Aurel can’t hear you.',
          steps: ['Open Windows privacy settings for the microphone.', 'Turn on “Let desktop apps access your microphone”.', 'Come back here and choose Try again.'],
        }
      : err === 'no-mic'
      ? {
          icon: 'micOff',
          badge: 'No microphone',
          title: 'We can’t find your microphone',
          text: 'Nothing is plugged in, or the mic you chose is no longer connected.',
          steps: ['Plug your mic straight into the PC, not through a hub.', 'Or choose another mic in Settings.', 'Aurel checks again when a mic is plugged in.'],
        }
      : {
          icon: 'alert',
          badge: 'Audio engine stopped',
          title: 'Aurel couldn’t start the audio engine',
          text: s.status.message ? `Windows reported: ${s.status.message}` : 'Something went wrong while opening your audio devices.',
          steps: ['Check your mic and output devices are connected.', 'Try a larger latency in Settings if it keeps happening.', 'Choose Try again.'],
        };
  return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <section role="alert" className="banner-error col" style={{ width: 'min(880px, 100%)', gap: 24, padding: '32px 36px' }}>
        <div className="row" style={{ gap: 18 }}>
          <span className="row" style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--error-tint)', justifyContent: 'center', color: 'var(--error-text)' }}><Icon name={content.icon} size={26} /></span>
          <div className="col" style={{ gap: 6 }}>
            <span className="chip chip-error" style={{ alignSelf: 'flex-start' }}>{content.badge}</span>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{content.title}</h1>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.55 }}>{content.text}</p>
        <div className="col" style={{ gap: 12 }}>
          <span className="h3">What to do</span>
          <ol className="col" style={{ listStyle: 'none', gap: 12 }}>
            {content.steps.map((t, i) => (
              <li key={i} className="row" style={{ gap: 14 }}>
                <span className="row mono" style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-control)', fontSize: 12, fontWeight: 600, justifyContent: 'center' }}>{i + 1}</span>
                <span className="small">{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="row" style={{ gap: 10, paddingTop: 8 }}>
          {err === 'permission' ? (
            <button className="btn btn-lg" onClick={() => window.studioAPI?.openMicPrivacySettings()} disabled={!window.studioAPI}>Open privacy settings</button>
          ) : (
            <button className="btn btn-lg" onClick={() => window.studioAPI?.openSoundSettings()} disabled={!window.studioAPI}>Open sound settings</button>
          )}
          {err === 'no-mic' && s.inputs.length > 0 && <button className="btn btn-lg" onClick={() => s.setPrefs({ inputId: s.inputs[0].deviceId })}>Use {s.inputs[0].label}</button>}
          <span className="grow" />
          <button className="btn btn-lg btn-primary" onClick={() => { s.refreshDevices(); s.restartEngine(); }}>Try again</button>
        </div>
      </section>
    </div>
  );
}
