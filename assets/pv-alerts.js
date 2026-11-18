// One alert episode spans all predictor tabs, until conditions clear or escalate.
function setupCleaningAlerts() {
  const el = id => document.getElementById(id);
  const sound = el('scene-sound'), notify = el('scene-notify');
  const feedback = el('alert-feedback'), notice = el('cleaning-notice');
  let audio, nativeNotice, soundOn = false, notificationsOn = false;
  let severity = 0, announced = 0, title = '', detail = '';

  function ring() {
    if (!audio || audio.state !== 'running') return;
    for (const [index, hz] of [660, 880, 660].entries()) {
      const start = audio.currentTime + index * 0.23;
      const tone = audio.createOscillator(), gain = audio.createGain();
      tone.connect(gain).connect(audio.destination);
      tone.frequency.value = hz;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.13, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      tone.start(start);
      tone.stop(start + 0.2);
    }
  }
  function sendNotice() {
    try {
      nativeNotice?.close();
      nativeNotice = new Notification(title, { body: detail, tag: 'pv-cleaning' });
    } catch {
      feedback.textContent = 'Desktop delivery is unavailable. Cleaning alerts appear here.';
      setNotifications(false);
    }
  }
  function setNotifications(enabled) {
    notificationsOn = enabled;
    notify.setAttribute('aria-pressed', String(enabled));
    notify.textContent = enabled ? 'Disable notifications' : 'Enable notifications';
  }
  sound.onclick = async () => {
    sound.disabled = true;
    try {
      if (!soundOn) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        await audio.resume();
        if (severity) ring();
      }
      soundOn = !soundOn;
      sound.setAttribute('aria-pressed', String(soundOn));
      sound.textContent = soundOn ? 'Mute alarm sound' : 'Enable alarm sound';
    } catch {
      feedback.textContent = 'Alarm sound is unavailable in this browser.';
    } finally { sound.disabled = false; }
  };
  notify.onclick = async () => {
    if (notificationsOn) { setNotifications(false); nativeNotice?.close(); return; }
    notify.disabled = true;
    try {
      if (!('Notification' in window) || !window.isSecureContext) {
        feedback.textContent = 'Desktop notifications need a supported browser on HTTPS or localhost.';
        return;
      }
      const permission = await Notification.requestPermission();
      setNotifications(permission === 'granted');
      feedback.textContent = notificationsOn ? 'Desktop notifications enabled for this session.' :
        'Desktop notifications are off. You can allow them in browser site settings.';
      if (notificationsOn && severity) sendNotice();
    } catch {
      feedback.textContent = 'Browser notifications are unavailable. Cleaning alerts appear here.';
    } finally { notify.disabled = false; }
  };
  el('notice-close').onclick = () => { notice.hidden = true; };

  return ({dust, loss, lossPct}, threshold) => {
    const dusty = dust >= threshold;
    severity = dust === 0 ? 0 : loss >= 15 || lossPct > 25 ? 2 : (dusty || loss >= 8 || lossPct > 12 ? 1 : 0);
    title = ['Panel status normal', 'Panel cleaning recommended', 'Panel cleaning required'][severity];
    const dustText = 'Dust ' + dust.toFixed(1) + ' g/m² ' + (dusty ? 'reached' : 'is below') +
      ' the ' + threshold.toFixed(1) + ' g/m² threshold.';
    detail = dust === 0 ? 'The simulated glass is clean (0.0 g/m²).' :
      dustText + ' Estimated loss ' + loss.toFixed(1) + ' W (' + lossPct.toFixed(1) + '%).';
    el('scene-alert').textContent = title + '. ' + detail;
    el('scene-alert').classList.toggle('high', severity > 0);
    const banner = el('maint-alert');
    banner.className = 'alert-banner ' + ['ok', 'warn', 'crit'][severity];
    banner.querySelector('.alert-icon').textContent = ['✅', '⚠️', '🚨'][severity];
    banner.querySelector('strong').textContent = title;
    banner.querySelector('strong + div').textContent = detail;
    if (!severity) {
      announced = 0;
      notice.hidden = true;
      nativeNotice?.close();
      return severity;
    }
    el('notice-title').textContent = title;
    el('notice-detail').textContent = detail;
    if (severity <= announced) return severity;
    announced = severity;
    notice.hidden = false;
    if (soundOn) ring();
    if (notificationsOn) sendNotice();
    return severity;
  };
}
