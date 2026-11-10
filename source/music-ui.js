(() => {
  'use strict';

  const audio = document.getElementById('bg-music');
  const dock = document.getElementById('music-dock');
  if (!audio || !dock) return;

  const playButton = document.getElementById('music-toggle');
  const muteButton = document.getElementById('music-mute');
  const volumeInput = document.getElementById('music-volume');
  const volumeLabel = document.getElementById('music-volume-label');
  const stateLabel = document.getElementById('music-state');
  const creditButton = document.getElementById('music-credit-toggle');
  const creditPanel = document.getElementById('music-credits');

  if (!playButton || !muteButton || !volumeInput || !volumeLabel || !stateLabel || !creditButton || !creditPanel) {
    return;
  }

  const DEFAULT_VOLUME = 0.30;
  let desiredVolume = DEFAULT_VOLUME;
  let muted = false;
  let failed = false;
  let starting = false;
  let pausing = false;
  let userWantsPlay = false;
  let hiddenResume = false;
  let fadeFrame = 0;
  let fadeToken = 0;
  let actionToken = 0;
  let notice = '';
  let noticeTimer = 0;

  audio.loop = true;
  audio.muted = false;
  audio.volume = 0;
  audio.preload = 'auto';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const isPlaying = () => !audio.paused && !audio.ended;
  const targetVolume = () => (muted ? 0 : desiredVolume);

  function setStatus(text) {
    if (stateLabel.textContent !== text) stateLabel.textContent = text;
  }

  function showNotice(text, duration = 2800) {
    notice = text;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => {
      notice = '';
      render();
    }, duration);
    render();
  }

  function render() {
    const playing = isPlaying();
    dock.dataset.playing = playing ? 'true' : 'false';
    dock.dataset.muted = muted ? 'true' : 'false';
    dock.dataset.error = failed ? 'true' : 'false';

    playButton.disabled = failed;
    playButton.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playButton.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
    playButton.title = playing ? '暂停背景音乐' : '播放背景音乐';

    muteButton.disabled = failed;
    muteButton.setAttribute('aria-pressed', muted ? 'true' : 'false');
    muteButton.setAttribute('aria-label', muted ? '取消静音' : '静音');
    muteButton.title = muted ? '取消静音' : '静音';

    volumeInput.disabled = failed;
    volumeInput.value = String(Math.round(desiredVolume * 100));
    volumeInput.setAttribute('aria-valuetext', muted ? '静音' : Math.round(desiredVolume * 100) + '%');
    volumeLabel.textContent = muted ? '静音' : Math.round(desiredVolume * 100) + '%';

    if (failed) {
      setStatus('音乐不可用');
      return;
    }
    if (notice) {
      setStatus(notice);
      return;
    }
    if (starting) {
      setStatus('载入中…');
      return;
    }
    if (pausing) {
      setStatus('正在暂停…');
      return;
    }
    if (playing) {
      setStatus(muted ? '播放中 · 静音' : '播放中');
      return;
    }
    if (audio.currentTime > 0.1) {
      setStatus(muted ? '已暂停 · 静音' : '已暂停');
      return;
    }
    setStatus(muted ? '已静音' : '点击播放');
  }

  function stopFade() {
    fadeToken++;
    if (fadeFrame) {
      window.cancelAnimationFrame(fadeFrame);
      fadeFrame = 0;
    }
  }

  function fadeTo(target, duration, done) {
    stopFade();
    const token = fadeToken;
    const from = clamp(audio.volume, 0, 1);
    const to = clamp(target, 0, 1);
    const durationMs = Math.max(1, duration * 1000);
    if (duration <= 0) {
      audio.volume = to;
      if (done) done();
      return;
    }
    const start = performance.now();
    const step = (now) => {
      if (token !== fadeToken) return;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      try {
        audio.volume = clamp(from + (to - from) * eased, 0, 1);
      } catch (error) {
        // Some browsers can throw while media is being torn down; playback state still updates.
      }
      if (t < 1) {
        fadeFrame = window.requestAnimationFrame(step);
      } else {
        fadeFrame = 0;
        if (done) done();
      }
    };
    fadeFrame = window.requestAnimationFrame(step);
  }

  function cancelPendingPlayback() {
    actionToken++;
    starting = false;
    pausing = false;
    userWantsPlay = false;
    stopFade();
    audio.volume = 0;
    try { audio.pause(); } catch (error) { /* ignore */ }
    render();
  }

  function beginPlayback(fadeDuration = 2) {
    if (failed || starting) return;
    if (!audio.paused) {
      userWantsPlay = true;
      render();
      return;
    }

    const token = ++actionToken;
    starting = true;
    pausing = false;
    userWantsPlay = true;
    notice = '';
    window.clearTimeout(noticeTimer);
    stopFade();
    audio.volume = 0;
    render();

    let playPromise;
    try {
      playPromise = audio.play();
    } catch (error) {
      starting = false;
      userWantsPlay = false;
      audio.volume = 0;
      showNotice('点击重试');
      if (window.console && console.warn) console.warn('Background music could not start:', error && error.message);
      return;
    }

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(() => {
        if (token !== actionToken || !userWantsPlay) {
          if (!audio.paused) {
            try { audio.pause(); } catch (error) { /* ignore */ }
          }
          render();
          return;
        }
        starting = false;
        render();
        if (muted) {
          audio.volume = 0;
        } else {
          fadeTo(desiredVolume, fadeDuration);
        }
      }).catch((error) => {
        if (token !== actionToken) return;
        starting = false;
        userWantsPlay = false;
        audio.volume = 0;
        if (!error || error.name !== 'AbortError') {
          if (window.console && console.warn) {
            console.warn('Background music playback was blocked:', error && error.name, error && error.message);
          }
          showNotice('点击重试');
        } else {
          render();
        }
      });
    } else {
      starting = false;
      render();
      if (!muted) fadeTo(desiredVolume, fadeDuration);
    }
  }

  function pausePlayback() {
    if (failed) return;
    userWantsPlay = false;
    actionToken++;
    if (audio.paused) {
      pausing = false;
      audio.volume = 0;
      render();
      return;
    }
    pausing = true;
    stopFade();
    render();
    fadeTo(0, 1, () => {
      if (!userWantsPlay) {
        try { audio.pause(); } catch (error) { /* ignore */ }
        audio.volume = 0;
      }
      pausing = false;
      render();
    });
  }

  function cancelPause() {
    pausing = false;
    userWantsPlay = true;
    actionToken++;
    stopFade();
    if (audio.paused) {
      beginPlayback(1.2);
      return;
    }
    fadeTo(targetVolume(), 0.28);
    render();
  }

  playButton.addEventListener('click', () => {
    if (failed) return;
    if (starting) {
      cancelPendingPlayback();
      return;
    }
    if (pausing) {
      cancelPause();
      return;
    }
    if (audio.paused) {
      beginPlayback(2);
    } else {
      pausePlayback();
    }
  });

  muteButton.addEventListener('click', () => {
    if (failed) return;
    muted = !muted;
    if (!muted && desiredVolume <= 0.001) desiredVolume = DEFAULT_VOLUME;
    stopFade();
    if (!audio.paused && !starting) {
      fadeTo(targetVolume(), muted ? 0.25 : 0.35);
    } else if (audio.paused) {
      audio.volume = 0;
    }
    render();
  });

  volumeInput.addEventListener('input', () => {
    if (failed) return;
    const next = clamp(Number(volumeInput.value) / 100 || 0, 0, 1);
    desiredVolume = next;
    muted = next <= 0.001;
    stopFade();
    if (!audio.paused) {
      try { audio.volume = targetVolume(); } catch (error) { /* ignore */ }
    } else {
      audio.volume = 0;
    }
    render();
  });

  audio.addEventListener('play', render);
  audio.addEventListener('playing', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', () => {
    if (!audio.loop) {
      userWantsPlay = false;
      render();
    }
  });
  audio.addEventListener('error', () => {
    failed = true;
    starting = false;
    pausing = false;
    userWantsPlay = false;
    stopFade();
    audio.volume = 0;
    render();
  });

  function closeCredits() {
    if (dock.dataset.creditsOpen !== 'true') return;
    dock.dataset.creditsOpen = 'false';
    creditButton.setAttribute('aria-expanded', 'false');
    creditPanel.setAttribute('aria-hidden', 'true');
  }

  function openCredits() {
    dock.dataset.creditsOpen = 'true';
    creditButton.setAttribute('aria-expanded', 'true');
    creditPanel.setAttribute('aria-hidden', 'false');
  }

  creditButton.addEventListener('click', () => {
    if (dock.dataset.creditsOpen === 'true') {
      closeCredits();
      creditButton.focus();
    } else {
      openCredits();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (dock.dataset.creditsOpen === 'true' && !dock.contains(event.target)) closeCredits();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dock.dataset.creditsOpen === 'true') {
      closeCredits();
      creditButton.focus();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (starting) {
        actionToken++;
        starting = false;
        userWantsPlay = false;
        pausing = false;
        stopFade();
        audio.volume = 0;
        try { audio.pause(); } catch (error) { /* ignore */ }
        render();
      } else if (!audio.paused) {
        hiddenResume = userWantsPlay;
        actionToken++;
        pausing = false;
        stopFade();
        audio.volume = 0;
        try { audio.pause(); } catch (error) { /* ignore */ }
        render();
      }
    } else if (hiddenResume) {
      hiddenResume = false;
      if (userWantsPlay && audio.paused) beginPlayback(1.2);
    }
  });

  dock.dataset.creditsOpen = 'false';
  dock.dataset.playing = 'false';
  dock.dataset.muted = 'false';
  dock.dataset.error = 'false';
  creditPanel.setAttribute('aria-hidden', 'true');
  render();
})();
