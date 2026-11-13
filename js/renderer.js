(function(global) {
  'use strict';
  const SW = global.ShadowWorld2 = global.ShadowWorld = global.ShadowWorld2 || {};

  SW.Renderer = {
    camX: 0,
    camY: 0,
    dust: [],

    init: function() {
      this.dust = [];
      for (let i = 0; i < 65; i++) {
        this.dust.push({
          x: Math.random() * 1400,
          y: Math.random() * 600,
          r: 0.8 + Math.random() * 2.2,
          vy: -6 - Math.random() * 14,
          vx: -8 + Math.random() * 16,
          alpha: 0.12 + Math.random() * 0.35
        });
      }
      if (typeof document !== 'undefined') {
        const grainEl = document.getElementById('grain-layer');
        if (grainEl) {
          const url = SW.CanvasUtils.generateFilmGrainDataURL(128);
          if (url) grainEl.style.backgroundImage = 'url(' + url + ')';
        }
      }
    },

    render: function(ctx, width, height, world, player) {
      if (!ctx) return;
      const targetCamX = player.x - width * 0.36;
      this.camX = SW.Math.lerp(this.camX, targetCamX, 0.12);
      const scaleY = height / 540;

      ctx.save();
      ctx.scale(scaleY, scaleY);
      const vw = width / scaleY;
      const vh = 540;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, vh);
      bgGrad.addColorStop(0, '#0c0d10');
      bgGrad.addColorStop(0.52, '#282b30');
      bgGrad.addColorStop(1, '#08090b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, vw, vh);

      const treeLayers = [
        { factor: 0.25, color: '#1b1d21', blurWidth: 1.3 },
        { factor: 0.55, color: '#111215', blurWidth: 1.0 },
        { factor: 0.82, color: '#090a0c', blurWidth: 0.8 }
      ];
      for (let l = 0; l < treeLayers.length; l++) {
        const cfg = treeLayers[l];
        ctx.fillStyle = cfg.color;
        for (let i = 0; i < world.trees.length; i++) {
          const tr = world.trees[i];
          if (tr.layer !== l) continue;
          const sx = (tr.x - this.camX * cfg.factor);
          if (sx < -200 || sx > vw + 200) continue;
          ctx.fillRect(sx, 0, tr.w * cfg.blurWidth, vh);
          if (tr.act >= 3) {
            ctx.fillRect(sx - 40, 120 + (i % 3) * 80, tr.w + 80, 10);
          }
        }
      }

      ctx.save();
      ctx.translate(-this.camX, 0);

      // Overhead Volumetric Light Shafts
      for (let i = 0; i < world.lightBeams.length; i++) {
        const lb = world.lightBeams[i];
        if (lb.x + lb.w < this.camX - 100 || lb.x > this.camX + vw + 100) continue;
        const lg = ctx.createLinearGradient(lb.x, 0, lb.x + lb.w, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, 'rgba(255,255,255,0.28)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(lb.x, lb.y, lb.w, lb.h);
      }

      // Water Zones
      for (let i = 0; i < world.waterZones.length; i++) {
        const wz = world.waterZones[i];
        if (wz.x + wz.w < this.camX - 100 || wz.x > this.camX + vw + 100) continue;
        ctx.fillStyle = 'rgba(4, 5, 7, 0.86)';
        ctx.fillRect(wz.x, wz.y, wz.w, wz.h);
        ctx.strokeStyle = 'rgba(220, 225, 230, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wz.x, wz.y);
        ctx.lineTo(wz.x + wz.w, wz.y);
        ctx.stroke();
      }

      // Platforms
      ctx.fillStyle = '#030304';
      for (let i = 0; i < world.platforms.length; i++) {
        const p = world.platforms[i];
        if (p.x + p.w < this.camX - 100 || p.x > this.camX + vw + 100) continue;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      // Spiked Pits
      for (let i = 0; i < world.spikes.length; i++) {
        const spk = world.spikes[i];
        if (spk.x + spk.w < this.camX - 100 || spk.x > this.camX + vw + 100) continue;
        ctx.fillStyle = '#030304';
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.2;
        const step = 14;
        for (let sx = spk.x; sx < spk.x + spk.w; sx += step) {
          ctx.beginPath();
          ctx.moveTo(sx, spk.y + spk.h);
          ctx.lineTo(sx + step * 0.5, spk.y);
          ctx.lineTo(sx + step, spk.y + spk.h);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Pullable Crates & Ferry Boats
      for (let i = 0; i < world.crates.length; i++) {
        const c = world.crates[i];
        if (c.x + c.w < this.camX - 100 || c.x > this.camX + vw + 100) continue;
        ctx.fillStyle = '#050506';
        ctx.strokeStyle = 'rgba(255,255,255,0.38)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeRect(c.x, c.y, c.w, c.h);
        ctx.beginPath();
        ctx.arc(c.x - 5, c.y + c.h * 0.5, 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Swinging Ropes & Knot Grip Indicator
      for (let i = 0; i < world.ropes.length; i++) {
        const r = world.ropes[i];
        if (Math.abs(r.x - this.camX) > vw + 200) continue;
        const tipX = r.x + Math.sin(r.angle) * r.length;
        const tipY = r.y + Math.cos(r.angle) * r.length;
        ctx.strokeStyle = '#050507';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Subtle glowing knot at bottom of rope for visual clarity
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bear Traps
      for (let i = 0; i < world.bearTraps.length; i++) {
        const bt = world.bearTraps[i];
        if (Math.abs(bt.x - this.camX) > vw + 200) continue;
        ctx.fillStyle = '#040405';
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bt.x, bt.y + 8, bt.w, 8);
        ctx.beginPath();
        if (bt.snapped) {
          ctx.moveTo(bt.x + 8, bt.y + 8);
          ctx.lineTo(bt.x + bt.w * 0.5, bt.y - 6);
          ctx.lineTo(bt.x + bt.w - 8, bt.y + 8);
        } else {
          for (let t = 0; t <= 4; t++) {
            const tx = bt.x + (t / 4) * bt.w;
            ctx.moveTo(tx, bt.y + 8);
            ctx.lineTo(tx, bt.y);
          }
        }
        ctx.stroke();
      }

      // Spinning Serrated Buzzsaws
      for (let i = 0; i < world.saws.length; i++) {
        const s = world.saws[i];
        if (Math.abs(s.x - this.camX) > vw + 200) continue;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.fillStyle = '#060608';
        ctx.strokeStyle = 'rgba(255,255,255,0.68)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const teeth = 16;
        for (let t = 0; t < teeth * 2; t++) {
          const rad = (t % 2 === 0) ? s.r : s.r * 0.78;
          const a = (t * Math.PI) / teeth;
          if (t === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
          else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Giant Rotating Industrial Cogs
      for (let i = 0; i < world.cogs.length; i++) {
        const cg = world.cogs[i];
        if (Math.abs(cg.x - this.camX) > vw + 250) continue;
        ctx.save();
        ctx.translate(cg.x, cg.y);
        ctx.rotate(cg.angle);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.fillStyle = '#040406';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, cg.r - 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Spokes
        for (let spk = 0; spk < 6; spk++) {
          const a = (spk * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * (cg.r - 10), Math.sin(a) * (cg.r - 10));
          ctx.stroke();
        }
        ctx.restore();
      }

      // Hydraulic Crushers
      for (let i = 0; i < world.crushers.length; i++) {
        const cr = world.crushers[i];
        if (Math.abs(cr.x - this.camX) > vw + 200) continue;
        ctx.fillStyle = '#040406';
        ctx.fillRect(cr.x + cr.w * 0.35, 0, cr.w * 0.3, cr.y);
        ctx.fillRect(cr.x, cr.y, cr.w, cr.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.strokeRect(cr.x, cr.y, cr.w, cr.h);
      }

      // Procedural 2D IK Giant Spiders
      for (let i = 0; i < world.spiders.length; i++) {
        const sp = world.spiders[i];
        if (sp.hp <= 0 || Math.abs(sp.x - this.camX) > vw + 300) continue;
        ctx.fillStyle = '#020203';
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, 44, 30, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sp.x - 32, sp.y + 6, 3, 0, Math.PI * 2);
        ctx.arc(sp.x - 24, sp.y + 10, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#030304';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        const attackIK = SW.Math.solveTwoJointIK(sp.x - 20, sp.y + 10, sp.legTargetX, sp.legTargetY, 115, 125, true);
        ctx.beginPath();
        ctx.moveTo(sp.x - 20, sp.y + 10);
        ctx.lineTo(attackIK.jx, attackIK.jy);
        ctx.lineTo(attackIK.ex, attackIK.ey);
        ctx.stroke();

        for (let leg = 0; leg < sp.hp; leg++) {
          const footX = sp.x + 25 + leg * 36 + Math.sin(world.time * 4 + leg) * 12;
          const legIK = SW.Math.solveTwoJointIK(sp.x + 10, sp.y + 8, footX, 420, 88, 98, true);
          ctx.beginPath();
          ctx.moveTo(sp.x + 10, sp.y + 8);
          ctx.lineTo(legIK.jx, legIK.jy);
          ctx.lineTo(legIK.ex, legIK.ey);
          ctx.stroke();
        }
      }

      // Tribal Blowgun Hunters
      for (let i = 0; i < world.hunters.length; i++) {
        const hu = world.hunters[i];
        if (!hu.alive || Math.abs(hu.x - this.camX) > vw + 200) continue;
        ctx.fillStyle = '#030304';
        ctx.fillRect(hu.x, hu.y + 14, hu.w, hu.h - 14);
        ctx.beginPath();
        ctx.arc(hu.x + hu.w * 0.5, hu.y + 9, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hu.x + (hu.vx < 0 ? 3 : 14), hu.y + 7, 2.5, 2.5);
      }

      // Brainworm Maggots & Ceiling Munchers
      for (let i = 0; i < world.maggots.length; i++) {
        const mg = world.maggots[i];
        if (!mg.active || Math.abs(mg.x - this.camX) > vw + 200) continue;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(mg.x, mg.y + Math.sin(world.time * 5) * 4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      for (let i = 0; i < world.munchers.length; i++) {
        const mu = world.munchers[i];
        if (Math.abs(mu.x - this.camX) > vw + 200) continue;
        ctx.fillStyle = '#040406';
        ctx.fillRect(mu.x, mu.y, mu.w, mu.h);
        // Muncher tendrils
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(mu.x + 12, mu.y + mu.h);
        ctx.lineTo(mu.x + 12, mu.y + mu.h + 12);
        ctx.moveTo(mu.x + 32, mu.y + mu.h);
        ctx.lineTo(mu.x + 32, mu.y + mu.h + 12);
        ctx.stroke();
      }

      // Electrified HOTEL Signs with Pre-Shock Flicker Warning
      for (let i = 0; i < world.electricSigns.length; i++) {
        const es = world.electricSigns[i];
        if (Math.abs(es.x - this.camX) > vw + 200) continue;
        ctx.save();
        ctx.font = 'bold 20px Courier New';
        if (es.electrified) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(es.x, es.y + 6, es.w, 18);
        } else if (es.warning) {
          ctx.fillStyle = (Math.floor(world.time * 24) % 2 === 0) ? '#ffffff' : '#6c7178';
        } else {
          ctx.fillStyle = '#555960';
        }
        ctx.fillText(es.letter, es.x + 26, es.y + 2);
        ctx.restore();
      }

      // Automated Turrets & Gravity Switches
      for (let i = 0; i < world.turrets.length; i++) {
        const tu = world.turrets[i];
        if (Math.abs(tu.x - this.camX) > vw + 450) continue;
        ctx.fillStyle = '#050507';
        ctx.fillRect(tu.x - 12, tu.y, 24, 38);
        ctx.strokeStyle = tu.lockTimer > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = tu.lockTimer > 0 ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(tu.x, tu.y + 10);
        ctx.lineTo(tu.x - tu.range, tu.y + 10);
        ctx.stroke();
      }
      for (let i = 0; i < world.gravitySwitches.length; i++) {
        const gs = world.gravitySwitches[i];
        if (Math.abs(gs.x - this.camX) > vw + 200) continue;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(gs.x, gs.y, gs.w, gs.h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText(gs.targetDir === -1 ? '↑' : '↓', gs.x + 8, gs.y + 30);
      }

      // Chapter 40 Shattering Glass Wall
      for (let i = 0; i < world.glassWalls.length; i++) {
        const gw = world.glassWalls[i];
        if (Math.abs(gw.x - this.camX) > vw + 300) continue;
        if (!gw.shattered) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.fillRect(gw.x, gw.y, gw.w, gw.h);
          ctx.strokeRect(gw.x, gw.y, gw.w, gw.h);
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          for (let s = 0; s < gw.shards.length; s++) {
            const sh = gw.shards[s];
            ctx.fillRect(sh.x, sh.y, sh.size, sh.size * 0.6);
          }
        }
      }

      // Glowing Secret Eggs
      for (let i = 0; i < world.eggs.length; i++) {
        const eg = world.eggs[i];
        if (eg.collected || Math.abs(eg.x - this.camX) > vw + 200) continue;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(eg.x, eg.y, eg.r * 0.8, eg.r * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Foreground Protagonist Silhouette ("The Boy")
      if (player.dead) {
        ctx.fillStyle = '#030304';
        for (let i = 0; i < player.ragdollParts.length; i++) {
          const p = player.ragdollParts[i];
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.save();
        const cx = player.x + player.w * 0.5;
        const cy = player.y + player.h * 0.5;
        ctx.translate(cx, cy);
        if (player.gravityDir === -1) ctx.scale(1, -1);

        const swing = Math.sin(player.animTimer) * (Math.abs(player.vx) > 20 ? 7 : 0);
        ctx.strokeStyle = '#020203';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-3, 6);
        ctx.lineTo(-4 + swing, 21);
        ctx.moveTo(3, 6);
        ctx.lineTo(4 - swing, 21);
        ctx.stroke();

        ctx.fillStyle = '#020203';
        ctx.fillRect(-7, -6, 14, 15);
        ctx.beginPath();
        ctx.arc(0, -13, 10.5, 0, Math.PI * 2);
        ctx.fill();

        if ((player.blinkTimer % 4.2) < 4.05) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
          const eyeX = player.facing * 4;
          ctx.beginPath();
          ctx.arc(eyeX - 2, -14, 1.9, 0, Math.PI * 2);
          ctx.arc(eyeX + 3, -14, 1.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        if (player.maggotAttached) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.ellipse(0, -24, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }

      ctx.restore();

      ctx.fillStyle = 'rgba(235, 240, 245, 0.25)';
      for (let i = 0; i < this.dust.length; i++) {
        const d = this.dust[i];
        d.x = (d.x + d.vx * 0.016 + vw) % vw;
        d.y = (d.y + d.vy * 0.016 + vh) % vh;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SW.Renderer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
