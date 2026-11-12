(function(global) {
  'use strict';
  const SW = global.ShadowWorld2 = global.ShadowWorld = global.ShadowWorld2 || {};

  SW.Player = {
    x: 120,
    y: 300,
    w: 22,
    h: 44,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    gravityDir: 1,
    dead: false,
    deathReason: '',
    deathTimer: 0,
    ragdollParts: [],
    animTimer: 0,
    stepTimer: 0,
    blinkTimer: 0,
    attachedRope: null,
    ropeGrabRatio: 0.92,
    ropeCooldown: 0,
    grabbedEntity: null,
    maggotAttached: false,
    maggotDir: 1,
    webbed: false,
    submergedTimer: 0,

    spawn: function(x, y) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.grounded = false;
      this.gravityDir = 1;
      this.dead = false;
      this.deathReason = '';
      this.deathTimer = 0;
      this.ragdollParts = [];
      this.attachedRope = null;
      this.ropeGrabRatio = 0.92;
      this.ropeCooldown = 0;
      this.grabbedEntity = null;
      this.maggotAttached = false;
      this.maggotDir = 1;
      this.webbed = false;
      this.submergedTimer = 0;
    },

    releaseRope: function(withJump) {
      const r = this.attachedRope;
      if (!r) return;
      const swingSpeedX = Math.cos(r.angle) * r.angVel * (r.length * this.ropeGrabRatio);
      const swingSpeedY = -Math.sin(r.angle) * r.angVel * (r.length * this.ropeGrabRatio);
      this.attachedRope = null;
      this.ropeCooldown = 0.45; // Prevents immediate re-grabbing of the same rope!

      if (withJump) {
        const dirBoost = (SW.Input.right ? 1 : (SW.Input.left ? -1 : this.facing));
        this.vx = swingSpeedX + dirBoost * 215;
        this.vy = Math.min(-240, swingSpeedY) - SW.Config.PLAYER_JUMP * 0.88 * this.gravityDir;
        if (SW.Audio && SW.Audio.playJump) SW.Audio.playJump();
      } else {
        // Clean drop release straight down
        this.vx = swingSpeedX * 0.55;
        this.vy = 65 * this.gravityDir;
      }
      // Clear any buffered jump/drop inputs
      SW.Input.consumeJump();
      SW.Input.consumeDrop();
    },

    kill: function(reason) {
      if (this.dead) return;
      this.dead = true;
      this.attachedRope = null;
      this.deathReason = reason || 'CRUSHED';
      this.deathTimer = 1.35;
      if (SW.Audio && SW.Audio.playDeath) SW.Audio.playDeath();
      if (SW.Save && SW.Save.recordDeath) SW.Save.recordDeath();
      this.ragdollParts = [];
      for (let i = 0; i < 16; i++) {
        const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
        const spd = 90 + Math.random() * 240;
        this.ragdollParts.push({
          x: this.x + this.w * 0.5,
          y: this.y + this.h * 0.5,
          vx: Math.cos(ang) * spd + this.vx * 0.3,
          vy: Math.sin(ang) * spd - 120 * this.gravityDir,
          r: 2.5 + Math.random() * 5.5
        });
      }
    },

    update: function(dt, world) {
      if (this.dead) {
        this.deathTimer -= dt;
        for (let i = 0; i < this.ragdollParts.length; i++) {
          const p = this.ragdollParts[i];
          p.vy += SW.Config.GRAVITY * this.gravityDir * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        return;
      }

      if (this.ropeCooldown > 0) {
        this.ropeCooldown = Math.max(0, this.ropeCooldown - dt);
      }

      this.blinkTimer += dt;
      const moveSpeed = this.webbed ? SW.Config.PLAYER_SPEED * 0.52 : SW.Config.PLAYER_SPEED;
      let targetVx = 0;

      if (this.maggotAttached) {
        targetVx = this.maggotDir * moveSpeed * ((SW.Input.left || SW.Input.right) ? 0.65 : 1.05);
        this.facing = this.maggotDir;
      } else {
        if (SW.Input.left) {
          targetVx = -moveSpeed;
          this.facing = -1;
        } else if (SW.Input.right) {
          targetVx = moveSpeed;
          this.facing = 1;
        }
      }

      // Rope Swinging, Climbing & Clean Release
      if (this.attachedRope) {
        const r = this.attachedRope;
        if (SW.Input.left) {
          r.angVel -= 4.4 * dt;
          this.facing = -1;
        }
        if (SW.Input.right) {
          r.angVel += 4.4 * dt;
          this.facing = 1;
        }
        if (r.lengthens) {
          r.length = Math.min(r.maxLength, r.length + 34 * dt);
        }

        const activeLen = r.length * this.ropeGrabRatio;
        const tipX = r.x + Math.sin(r.angle) * activeLen;
        const tipY = r.y + Math.cos(r.angle) * activeLen;
        this.x = tipX - this.w * 0.5;
        this.y = tipY - this.h * 0.5;
        this.vx = Math.cos(r.angle) * r.angVel * activeLen;
        this.vy = -Math.sin(r.angle) * r.angVel * activeLen;

        // Release rope when player presses JUMP (Space/W/Up/Jump Pad) OR DROP (S/Down/Drop Pad)
        if (SW.Input.consumeJump()) {
          this.releaseRope(true);
          return;
        }
        if (SW.Input.consumeDrop()) {
          this.releaseRope(false);
          return;
        }
        return;
      }

      // Clear unused drop buffer when not on a rope
      SW.Input.consumeDrop();

      // Grabbing & Pulling Crates / Boats / Bear Traps
      this.grabbedEntity = null;
      if (SW.Input.action && this.grounded) {
        const pullables = world.getPullablesNear(this.x - 28, this.y - 10, this.w + 56, this.h + 20);
        if (pullables.length > 0) {
          this.grabbedEntity = pullables[0];
          targetVx *= 0.65;
          this.grabbedEntity.x += targetVx * dt;
          if (this.grabbedEntity.minX !== undefined) {
            this.grabbedEntity.x = SW.Math.clamp(this.grabbedEntity.x, this.grabbedEntity.minX, this.grabbedEntity.maxX);
          }
        }
      }

      this.vx = SW.Math.lerp(this.vx, targetVx, this.grounded ? 0.28 : 0.14);

      if (SW.Input.consumeJump() && this.grounded) {
        this.vy = -SW.Config.PLAYER_JUMP * (this.webbed ? 0.78 : 1.0) * this.gravityDir;
        this.grounded = false;
        if (SW.Audio && SW.Audio.playJump) SW.Audio.playJump();
      }

      // Apply Gravity
      this.vy += SW.Config.GRAVITY * this.gravityDir * dt;
      this.vy = SW.Math.clamp(this.vy, -780, 780);

      // Horizontal Movement & Collision
      this.x += this.vx * dt;
      const solids = world.getSolidsInRange(this.x - 120, this.x + 170);
      for (let i = 0; i < solids.length; i++) {
        const s = solids[i];
        if (SW.Math.aabb(this, s)) {
          if (this.vx > 0) this.x = s.x - this.w;
          else if (this.vx < 0) this.x = s.x + s.w;
          this.vx = 0;
        }
      }

      // Vertical Movement & Collision
      this.y += this.vy * dt;
      this.grounded = false;
      for (let i = 0; i < solids.length; i++) {
        const s = solids[i];
        if (SW.Math.aabb(this, s)) {
          if (this.gravityDir === 1) {
            if (this.vy >= 0) {
              this.y = s.y - this.h;
              this.vy = 0;
              this.grounded = true;
              // Carry player smoothly with moving ferry boats
              if (s.signedVx) this.x += s.signedVx * dt;
            } else {
              this.y = s.y + s.h;
              this.vy = 0;
            }
          } else {
            if (this.vy <= 0) {
              this.y = s.y + s.h;
              this.vy = 0;
              this.grounded = true;
            } else {
              this.y = s.y - this.h;
              this.vy = 0;
            }
          }
        }
      }

      // Walk Cycle & Footstep Audio
      if (this.grounded && Math.abs(this.vx) > 25) {
        this.animTimer += dt * (Math.abs(this.vx) / 38);
        this.stepTimer += dt;
        if (this.stepTimer > 0.34) {
          this.stepTimer = 0;
          if (SW.Audio && SW.Audio.playStep) SW.Audio.playStep();
        }
      } else {
        this.animTimer += dt * 1.5;
      }

      // Abyss / Ceiling Bounds Death
      if (this.y > 680 || this.y < -220) {
        this.kill('FELL INTO THE ABYSS');
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SW.Player;
  }
})(typeof window !== 'undefined' ? window : globalThis);
