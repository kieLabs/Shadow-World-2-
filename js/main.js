(function(global) {
  'use strict';
  const SW = global.ShadowWorld2 = global.ShadowWorld = global.ShadowWorld2 || {};

  SW.Main = {
    canvas: null,
    ctx: null,
    paused: false,
    lastTime: 0,
    toastTimer: 0,

    init: function() {
      if (typeof document === 'undefined') return;
      this.canvas = document.getElementById('game-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      SW.Save.load();
      SW.Input.init();
      SW.Renderer.init();
      SW.World.toastCallback = this.showToast.bind(this);
      SW.World.finaleCallback = this.onFinaleComplete.bind(this);
      SW.World.buildWorld();

      this.jumpToChapter(SW.Save.state.currentChapter);
      this.bindUI();
      this.buildChapterGrid();

      const self = this;
      global.addEventListener('resize', function() {
        SW.CanvasUtils.resizeCanvas(self.canvas);
      });
      SW.CanvasUtils.resizeCanvas(this.canvas);

      this.lastTime = performance.now();
      requestAnimationFrame(this.loop.bind(this));
    },

    onFinaleComplete: function() {
      const deaths = SW.Save.state.deaths;
      const heading = document.getElementById('modal-heading');
      const sub = document.getElementById('modal-sub');
      if (heading) heading.textContent = 'JOURNEY COMPLETE';
      if (sub) {
        const badge = deaths <= 5 ? ' • 🏆 ACHIEVEMENT: NO POINT IN DYING UNLOCKED!' : '';
        sub.textContent = 'ALL 40 CHAPTERS SURVIVED • TOTAL DEATHS: ' + deaths + badge;
      }
      this.setModal(true);
    },

    jumpToChapter: function(chNum) {
      const ch = SW.Math.clamp(chNum, 1, SW.Config.TOTAL_CHAPTERS);
      SW.Save.state.currentChapter = ch;
      SW.Save.save();
      const spawnX = (ch - 1) * SW.Config.CHAPTER_LENGTH + 110;
      SW.Player.spawn(spawnX, 340);
      SW.Renderer.camX = spawnX - 240;
      this.updateHUD();
      this.showToast(SW.World.chapterTitles[ch - 1]);
    },

    showToast: function(msg) {
      if (typeof document === 'undefined') return;
      const el = document.getElementById('toast-banner');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('visible');
      this.toastTimer = 2.8;
    },

    updateHUD: function() {
      if (typeof document === 'undefined') return;
      const ch = SW.Save.state.currentChapter;
      const chEl = document.getElementById('hud-chapter');
      const dEl = document.getElementById('hud-deaths');
      const eEl = document.getElementById('hud-eggs');
      if (chEl) chEl.textContent = 'CH ' + ch + '/40: ' + SW.World.chapterTitles[ch - 1].replace(/^\d+\.\s*/, '');
      if (dEl) dEl.textContent = 'DEATHS: ' + SW.Save.state.deaths;
      if (eEl) eEl.textContent = 'EGGS: ' + SW.Save.getEggCount() + '/13';
    },

    buildChapterGrid: function() {
      const grid = document.getElementById('chapter-list');
      if (!grid) return;
      grid.innerHTML = '';
      const self = this;
      for (let i = 1; i <= SW.Config.TOTAL_CHAPTERS; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chapter-btn' + (i === SW.Save.state.currentChapter ? ' current' : '');
        btn.textContent = SW.World.chapterTitles[i - 1];
        btn.addEventListener('click', function() {
          const heading = document.getElementById('modal-heading');
          const sub = document.getElementById('modal-sub');
          if (heading) heading.textContent = 'SHADOW WORLD 2';
          if (sub) sub.textContent = '40 LETHAL CHAPTERS • PROCEDURAL IK & HORROR AUDIO';
          self.jumpToChapter(i);
          self.setModal(false);
        });
        grid.appendChild(btn);
      }
    },

    setModal: function(open) {
      this.paused = open;
      const modal = document.getElementById('modal-menu');
      if (modal) modal.classList.toggle('active', open);
      if (open) this.buildChapterGrid();
    },

    toggleFullscreen: function() {
      const root = document.getElementById('game-root') || document.documentElement;
      if (!document.fullscreenElement) {
        if (root.requestFullscreen) root.requestFullscreen().catch(function() {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(function() {});
      }
    },

    bindUI: function() {
      const self = this;
      const onClick = function(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', function(e) {
          e.preventDefault();
          SW.Audio.resume();
          fn();
        });
      };

      onClick('btn-pause', function() { self.setModal(!self.paused); });
      onClick('btn-chapters', function() { self.setModal(true); });
      onClick('btn-resume', function() { self.setModal(false); });
      onClick('btn-retry', function() { self.jumpToChapter(SW.Save.state.currentChapter); });
      onClick('btn-restart-ch', function() {
        self.jumpToChapter(SW.Save.state.currentChapter);
        self.setModal(false);
      });
      onClick('btn-audio', function() {
        const on = SW.Audio.toggle();
        const el = document.getElementById('btn-audio');
        if (el) el.textContent = on ? '🔊 AUDIO: ON' : '🔇 AUDIO: OFF';
      });
      onClick('btn-fullscreen', function() {
        self.toggleFullscreen();
      });
      onClick('btn-toggle-gesture', function() {
        SW.Save.state.gestureEnabled = !SW.Save.state.gestureEnabled;
        SW.Save.save();
        const el = document.getElementById('btn-toggle-gesture');
        if (el) el.textContent = SW.Save.state.gestureEnabled ? '🖐 TOUCH: BUTTONS + SWIPE' : '🎮 TOUCH: BUTTONS ONLY';
      });
    },

    loop: function(now) {
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(SW.Config.MAX_DT, Math.max(0.001, rawDt));

      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) {
          const tEl = document.getElementById('toast-banner');
          if (tEl) tEl.classList.remove('visible');
        }
      }

      if (!this.paused) {
        SW.Player.update(dt, SW.World);
        SW.World.update(dt, SW.Player);

        // Visually highlight DROP button whenever player is holding a rope
        const dropBtn = document.getElementById('pad-drop');
        if (dropBtn) {
          dropBtn.classList.toggle('rope-active', !!SW.Player.attachedRope);
        }

        if (!SW.Player.dead) {
          const currentCh = SW.Math.clamp(Math.floor(Math.max(0, SW.Player.x) / SW.Config.CHAPTER_LENGTH) + 1, 1, 40);
          if (currentCh !== SW.Save.state.currentChapter) {
            SW.Save.state.currentChapter = currentCh;
            SW.Save.save();
            this.updateHUD();
            this.showToast('CHECKPOINT: ' + SW.World.chapterTitles[currentCh - 1]);
          }
        } else if (SW.Player.deathTimer <= 0) {
          this.updateHUD();
          this.jumpToChapter(SW.Save.state.currentChapter);
        }
      }

      const dims = SW.CanvasUtils.resizeCanvas(this.canvas);
      SW.Renderer.render(this.ctx, dims.width, dims.height, SW.World, SW.Player);
      requestAnimationFrame(this.loop.bind(this));
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
      SW.Main.init();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
