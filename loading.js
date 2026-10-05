(function () {
  'use strict';
  var config = window.INVICTUS_CONFIG || {};
  var total = null;
  var needed = null;
  var downloadComplete = false;
  var currentStatus = 'Establishing connection…';
  var demoTimer = null;
  var demoRunning = false;
  var tipIndex = 0;
  var video = document.getElementById('wallpaper');
  var tips = config.tips && config.tips.length ? config.tips : ['The Emperor protects.'];

  function byId(id) { return document.getElementById(id); }
  function text(id, value) { var element = byId(id); if (element) element.textContent = String(value); }
  function number(value) {
    if (value === '' || value === null || typeof value === 'undefined' || typeof value === 'boolean') return null;
    var result = Number(value);
    return isFinite(result) && result >= 0 ? Math.floor(result) : null;
  }
  function param(name) {
    var parts = window.location.search.substring(1).split('&');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      try { if (decodeURIComponent(pair[0]) === name) return decodeURIComponent((pair.slice(1).join('=') || '').replace(/\+/g, ' ')); } catch (error) {}
    }
    return '';
  }
  function stopDemo() {
    if (demoRunning) return;
    if (demoTimer) window.clearInterval(demoTimer);
    demoTimer = null;
  }
  function noProgress(label) {
    var bar = byId('loading-bar');
    bar.className = 'progress-track is-indeterminate';
    bar.removeAttribute('aria-valuenow');
    bar.setAttribute('aria-valuetext', label || 'Waiting for download information');
    byId('progress-fill').style.width = '';
    text('loading-percent', '—');
  }
  function renderProgress() {
    var bar = byId('loading-bar');
    if (total === null || needed === null) {
      noProgress();
      text('file-count', 'Awaiting resource list');
      return;
    }
    if (total === 0 && needed === 0) {
      noProgress('No resource downloads required; continuing connection');
      text('file-count', 'No downloads required');
      text('current-file', 'Preparing to enter the server');
      return;
    }
    if (total === 0 || needed > total) {
      noProgress('Synchronising the resource list');
      text('file-count', String(needed) + ' files remaining');
      return;
    }
    var completed = Math.max(0, total - needed);
    var percent = Math.max(0, Math.min(100, Math.floor(completed / total * 100)));
    bar.className = 'progress-track';
    bar.setAttribute('aria-valuenow', String(percent));
    bar.setAttribute('aria-valuetext', String(percent) + '% of resource files downloaded');
    byId('progress-fill').style.width = percent + '%';
    text('loading-percent', percent + '%');
    text('file-count', completed + ' / ' + total + ' files');
    downloadComplete = needed === 0;
    if (downloadComplete) {
      text('current-file', 'Downloads complete · preparing to deploy');
      text('connection-label', 'PREPARING DEPLOYMENT');
    }
  }
  function setTip(index) {
    text('tip-text', tips[index]);
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    text('tip-counter', pad(index + 1) + ' / ' + pad(tips.length));
  }

  text('brand-first', config.brandFirst || 'INVICTUS');
  text('brand-second', config.brandSecond || 'SANCTORUM');
  text('footer-name', (config.brandFirst || 'INVICTUS') + ' ' + (config.brandSecond || 'SANCTORUM'));
  text('server-name', config.serverName || 'Invictus Sanctorum');
  text('realm-label', config.realmLabel || 'WARHAMMER 40,000');
  text('gamemode-name', config.defaultGamemode || 'Warhammer 40,000 RP');
  text('hero-kicker', config.kicker || 'IN THE NAME OF THE EMPEROR');
  text('motto', config.motto || 'The Emperor protects.');
  document.title = (config.brandFirst || 'INVICTUS') + ' ' + (config.brandSecond || 'SANCTORUM') + ' | Warhammer 40,000 Roleplay';
  var queryMap = param('map') || param('Map');
  if (queryMap && queryMap !== '%m') text('map-name', queryMap);
  setTip(0);
  var tipDelay = Math.max(5000, number(config.tipInterval) || 14000);
  if (tips.length > 1) window.setInterval(function () {
    var tip = byId('tip-text');
    tip.className = 'tip-text is-fading';
    window.setTimeout(function () {
      tipIndex = (tipIndex + 1) % tips.length;
      setTip(tipIndex);
      tip.className = 'tip-text';
    }, 320);
  }, tipDelay);

  // These five global callbacks are called by Garry's Mod's loading browser.
  // Percentages represent resource files, rather than total connection time.
  window.GameDetails = function (servername, serverurl, mapname, maxplayers, steamid, gamemode, volume, language) {
    stopDemo();
    if (servername) text('server-name', servername);
    if (mapname) text('map-name', mapname);
    if (gamemode) text('gamemode-name', gamemode);
    text('connection-label', 'LINK ESTABLISHED');
  };
  window.SetFilesTotal = function (value) {
    stopDemo();
    var parsed = number(value);
    if (parsed === null) return;
    total = parsed;
    downloadComplete = false;
    renderProgress();
  };
  window.SetFilesNeeded = function (value) {
    stopDemo();
    var parsed = number(value);
    if (parsed === null) return;
    needed = parsed;
    renderProgress();
  };
  window.DownloadingFile = function (filename) {
    stopDemo();
    if (filename) text('current-file', filename);
    currentStatus = 'Downloading server resources…';
    text('loading-status', currentStatus);
    text('connection-label', 'RECEIVING RESOURCES');
  };
  window.SetStatusChanged = function (status) {
    stopDemo();
    if (!status) return;
    currentStatus = String(status);
    text('loading-status', currentStatus);
    if (downloadComplete || /sending client info|starting lua|initializing|initialising/i.test(currentStatus)) {
      text('connection-label', 'PREPARING DEPLOYMENT');
      if (downloadComplete) text('current-file', 'Resources ready · awaiting server');
    }
  };

  // The supplied VP8 WebM is muted, loops, and needs no external services.
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  if (config.poster) video.poster = config.poster;
  if (config.video) {
    var source = video.getElementsByTagName('source')[0];
    if (source && source.getAttribute('src') !== config.video) { source.src = config.video; video.load(); }
  }
  function startVideo() {
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) { video.pause(); return; }
    try { var attempt = video.play(); if (attempt && attempt.catch) attempt.catch(function () {}); } catch (error) {}
  }
  video.addEventListener('canplay', startVideo);
  video.addEventListener('error', function () { video.style.opacity = '0'; });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) video.pause(); else startVideo();
  });
  startVideo();

  // ?preview=1 is an explicit browser-only demonstration. Normal visits never
  // invent a percentage, player count, map or download sequence.
  if (param('preview') === '1') {
    var step = 0;
    var files = ['materials/invictus/insignia.vmt', 'models/players/guardsman.mdl', 'sound/ambient/vox_static.wav'];
    demoRunning = true;
    window.GameDetails(config.serverName || 'Invictus Sanctorum', '', 'gm_construct', 0, '', 'Warhammer 40,000 RP');
    text('connection-label', 'PREVIEW');
    window.SetFilesTotal(120);
    window.SetFilesNeeded(120);
    demoRunning = false;
    demoTimer = window.setInterval(function () {
      demoRunning = true;
      step += 1;
      if (step <= 24) {
        window.DownloadingFile(files[step % files.length]);
        window.SetFilesNeeded(Math.max(0, 120 - step * 5));
      } else if (step < 30) window.SetStatusChanged('Starting Lua…');
      else { step = 0; window.SetFilesTotal(120); window.SetFilesNeeded(120); }
      text('connection-label', 'PREVIEW');
      demoRunning = false;
    }, 1100);
  }
}());
