<template>
  <div class="fireworks-overlay">
    <canvas ref="canvasRef" class="fireworks-canvas"></canvas>
    <div class="message-container">
      <h1 class="congrats-text">{{ mainText }}</h1>
      <h2 class="sub-text">{{ subText }}</h2>
      <p v-if="descText" class="desc-text">{{ descText }}</p>
      <a 
        v-if="linkUrl" 
        :href="linkUrl" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="v2-link-btn"
      >
        {{ linkText || 'Visit Chit-Chut V2' }}
      </a>
      <button v-if="showCloseButton" class="enter-btn" @click="emit('close')">ENTER APP</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    mainText?: string
    subText?: string
    descText?: string
    showCloseButton?: boolean
    linkUrl?: string
    linkText?: string
  }>(),
  {
    mainText: 'CONGRATULATIONS',
    subText: '',
    descText: '',
    showCloseButton: false,
    linkUrl: '',
    linkText: ''
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  color: string
  size: number
  gravity: number
  fade: number
  friction: number
  colorMorph?: string
  sparkle: boolean
}

interface Firework {
  x: number
  y: number
  targetY: number
  vx: number
  vy: number
  color: string
  type: 'normal' | 'ring' | 'double' | 'chrysanthemum'
}

interface MiniFirework {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  timer: number
}

interface Flash {
  x: number
  y: number
  radius: number
  alpha: number
  color: string
}

// ----------------------------------------------------------------------------
// WEB AUDIO API SYNTHESIZER (SHARED GLOBALLY)
// ----------------------------------------------------------------------------
const initAudio = () => {
  if (!(window as any).sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      (window as any).sharedAudioCtx = new AudioContextClass()
    }
  }
  const ctx = (window as any).sharedAudioCtx
  if (ctx && ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

// Sound of a climbing launch rocket (pitch whoosh)
const playLaunchSound = () => {
  const ctx = initAudio()
  if (!ctx || ctx.state !== 'running') return

  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(60, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 1.0)
  
  gainNode.gain.setValueAtTime(0.005, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.15)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
  
  osc.start()
  osc.stop(ctx.currentTime + 1.0)
}

// Sound of a crackling firework (highpass filtered noise grain)
const playCrackleSound = (type: string) => {
  const ctx = initAudio()
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  const duration = type === 'chrysanthemum' ? 0.9 : 0.4
  
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  
  for (let i = 0; i < bufferSize; i++) {
    const noise = Math.random() * 2 - 1
    const density = type === 'chrysanthemum' ? 0.96 : 0.93
    data[i] = Math.random() > density ? noise : 0
  }
  
  const noiseNode = ctx.createBufferSource()
  noiseNode.buffer = buffer
  
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1800
  
  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.05, now)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
  
  noiseNode.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  noiseNode.start()
}

// Sound of detonation (deep bass thump + crackle)
const playExplosionSound = (type: 'normal' | 'ring' | 'double' | 'chrysanthemum') => {
  const ctx = initAudio()
  if (!ctx || ctx.state !== 'running') return

  const now = ctx.currentTime

  // Low frequency boom
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)

  osc.type = 'sine'
  osc.frequency.setValueAtTime(100, now)
  osc.frequency.exponentialRampToValueAtTime(15, now + 0.55)

  const volume = type === 'chrysanthemum' ? 0.35 : type === 'double' ? 0.25 : 0.3
  gainNode.gain.setValueAtTime(volume, now)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

  osc.start()
  osc.stop(now + 0.6)

  // Trigger crisp secondary crackles
  if (type === 'chrysanthemum' || type === 'double' || Math.random() < 0.45) {
    playCrackleSound(type)
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Set canvas size
  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // Initialize audio immediately for auto-play
  initAudio()

  // Global document click auto-initializer for sound
  window.addEventListener('click', initAudio)
  window.addEventListener('touchstart', initAudio)

  const particles: Particle[] = []
  const fireworks: Firework[] = []
  const miniFireworks: MiniFirework[] = []
  const flashes: Flash[] = []

  const colors = [
    '#ff2a6d', // neon pink
    '#05d9e8', // neon cyan
    '#f5a623', // orange gold
    '#7ed321', // lime green
    '#f8e71c', // yellow
    '#bd10e0', // violet
    '#9013fe', // purple
    '#ff5e00', // vibrant orange
    '#00ff66'  // bright spring green
  ]

  const wind = 0.015

  const createFirework = () => {
    const x = Math.random() * canvas.width
    const y = canvas.height
    const targetY = Math.random() * (canvas.height * 0.4) + canvas.height * 0.12
    const color = colors[Math.floor(Math.random() * colors.length)]
    
    const vy = -(Math.random() * 5 + 8)
    const vx = Math.random() * 3 - 1.5

    const rand = Math.random()
    let type: 'normal' | 'ring' | 'double' | 'chrysanthemum' = 'normal'
    if (rand < 0.15) type = 'ring'
    else if (rand < 0.35) type = 'double'
    else if (rand < 0.55) type = 'chrysanthemum'

    fireworks.push({ x, y, targetY, vx, vy, color, type })
    
    // Play launch sweep
    playLaunchSound()
  }

  const explode = (x: number, y: number, color1: string, type: 'normal' | 'ring' | 'double' | 'chrysanthemum') => {
    const color2 = colors[Math.floor(Math.random() * colors.length)]
    
    flashes.push({
      x,
      y,
      radius: Math.random() * 120 + 160,
      alpha: 0.35,
      color: color1
    })

    // Play synthesis explosion boom & crackle
    playExplosionSound(type)

    if (type === 'ring') {
      const particleCount = 80
      const baseSpeed = Math.random() * 3 + 3.5
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2
        const pColor = i % 2 === 0 ? color1 : color2
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * baseSpeed,
          vy: Math.sin(angle) * baseSpeed,
          alpha: 1,
          color: pColor,
          size: Math.random() * 2 + 1.5,
          gravity: 0.045,
          fade: Math.random() * 0.008 + 0.006,
          friction: 0.98,
          sparkle: Math.random() < 0.3
        })
      }
    } else if (type === 'double') {
      const miniCount = Math.floor(Math.random() * 7) + 7
      for (let i = 0; i < miniCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 3 + 3
        miniFireworks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: color1,
          timer: Math.floor(Math.random() * 15) + 20
        })
      }
      
      const particleCount = 35
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 4 + 1
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: color2,
          size: Math.random() * 1.5 + 1.2,
          gravity: 0.055,
          fade: Math.random() * 0.015 + 0.008,
          friction: 0.965,
          sparkle: false
        })
      }
    } else if (type === 'chrysanthemum') {
      const particleCount = 100
      const speed = Math.random() * 4 + 3.5
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const s = (Math.random() * 0.35 + 0.65) * speed
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * s,
          vy: Math.sin(angle) * s,
          alpha: 1,
          color: '#f5a623',
          size: Math.random() * 1.8 + 1.2,
          gravity: 0.045,
          fade: Math.random() * 0.007 + 0.005,
          friction: 0.97,
          colorMorph: '#ffffff',
          sparkle: Math.random() < 0.6
        })
      }
    } else {
      const particleCount = Math.floor(Math.random() * 70) + 70
      const speed = Math.random() * 5.5 + 1.5
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const s = (Math.random() * 0.4 + 0.6) * speed
        const pColor = Math.random() < 0.65 ? color1 : color2
        const morphColor = Math.random() < 0.55 ? '#f5a623' : undefined 
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * s,
          vy: Math.sin(angle) * s,
          alpha: 1,
          color: pColor,
          size: Math.random() * 1.8 + 1.2,
          gravity: 0.065,
          fade: Math.random() * 0.012 + 0.007,
          friction: 0.97,
          colorMorph: morphColor,
          sparkle: Math.random() < 0.4
        })
      }
    }
  }

  const animate = () => {
    ctx.fillStyle = 'rgba(5, 5, 11, 0.22)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (Math.random() < 0.10) {
      createFirework()
    }
    
    if (Math.random() < 0.02) {
      const clusterSize = Math.floor(Math.random() * 2) + 2
      for (let c = 0; c < clusterSize; c++) {
        setTimeout(createFirework, c * 180)
      }
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius)
      grad.addColorStop(0, f.color)
      grad.addColorStop(0.2, f.color)
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
      
      ctx.save()
      ctx.globalAlpha = f.alpha
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      f.alpha -= 0.05
      if (f.alpha <= 0) {
        flashes.splice(i, 1)
      }
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
      const f = fireworks[i]
      f.x += f.vx
      f.y += f.vy
      f.vy += 0.06

      ctx.beginPath()
      ctx.moveTo(f.x - f.vx * 1.8, f.y - f.vy * 1.8)
      ctx.lineTo(f.x, f.y)
      ctx.strokeStyle = 'rgba(255, 210, 140, 0.65)'
      ctx.lineWidth = 3.0
      ctx.stroke()

      if (Math.random() < 0.65) {
        particles.push({
          x: f.x,
          y: f.y,
          vx: f.vx * 0.25 + (Math.random() * 1.2 - 0.6),
          vy: f.vy * -0.2 + (Math.random() * 1.5),
          alpha: 0.7,
          color: '#f5a623',
          size: Math.random() * 1.2 + 0.6,
          gravity: 0.12,
          fade: 0.05,
          friction: 0.98,
          sparkle: true
        })
      }

      if (f.vy >= 0 || f.y <= f.targetY) {
        explode(f.x, f.y, f.color, f.type)
        fireworks.splice(i, 1)
      }
    }

    for (let i = miniFireworks.length - 1; i >= 0; i--) {
      const mf = miniFireworks[i]
      mf.x += mf.vx
      mf.y += mf.vy
      mf.vx *= 0.965
      mf.vy *= 0.965
      mf.vy += 0.04

      ctx.beginPath()
      ctx.moveTo(mf.x - mf.vx * 1.5, mf.y - mf.vy * 1.5)
      ctx.lineTo(mf.x, mf.y)
      ctx.strokeStyle = mf.color
      ctx.lineWidth = 1.8
      ctx.stroke()

      mf.timer--
      if (mf.timer <= 0) {
        const subColor = colors[Math.floor(Math.random() * colors.length)]
        const subCount = Math.floor(Math.random() * 12) + 8
        for (let j = 0; j < subCount; j++) {
          const angle = Math.random() * Math.PI * 2
          const speed = Math.random() * 2 + 1
          particles.push({
            x: mf.x,
            y: mf.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: subColor,
            size: Math.random() * 1.2 + 0.8,
            gravity: 0.05,
            fade: Math.random() * 0.025 + 0.015,
            friction: 0.96,
            sparkle: true
          })
        }
        flashes.push({
          x: mf.x,
          y: mf.y,
          radius: 50,
          alpha: 0.2,
          color: subColor
        })
        
        // Sub-burst sound
        playExplosionSound('normal')
        
        miniFireworks.splice(i, 1)
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      
      p.x += p.vx
      p.y += p.vy
      p.vx *= p.friction
      p.vy *= p.friction
      p.vy += p.gravity
      p.vx += wind
      p.alpha -= p.fade

      if (p.alpha <= 0) {
        particles.splice(i, 1)
        continue
      }

      if (p.colorMorph && p.alpha < 0.6) {
        p.color = p.colorMorph
        p.colorMorph = undefined
      }

      let drawAlpha = p.alpha
      if (p.sparkle && Math.random() < (p.alpha < 0.45 ? 0.6 : 0.35)) {
        drawAlpha = Math.random() * 0.35 + 0.15
      }

      ctx.save()
      ctx.globalAlpha = drawAlpha
      ctx.beginPath()
      ctx.moveTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5)
      ctx.lineTo(p.x, p.y)
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.restore()
    }

    animationId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    window.removeEventListener('resize', resizeCanvas)
    window.removeEventListener('click', initAudio)
    window.removeEventListener('touchstart', initAudio)
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  })
})
</script>

<style scoped>
.fireworks-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #040409;
  z-index: 9999;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.fireworks-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(5, 217, 232, 0.15) 0%, rgba(99, 30, 253, 0.08) 55%, transparent 100%);
  animation: bg-pulse 4.5s infinite alternate ease-in-out;
  pointer-events: none;
  z-index: 1;
}

.fireworks-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.message-container {
  position: relative;
  z-index: 10;
  text-align: center;
  pointer-events: none;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 3.5rem;
  background: rgba(10, 10, 18, 0.48);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 32px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.65),
              0 0 60px rgba(99, 30, 253, 0.25);
  max-width: 90%;
  animation: container-float 6s infinite ease-in-out;
}

.congrats-text {
  font-size: 5.5rem;
  font-weight: 950;
  text-transform: uppercase;
  background: linear-gradient(135deg, #ffffff 10%, #e0f2fe 45%, #38bdf8 70%, #0284c7 95%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: metallic-shine 4s ease infinite alternate;
  margin-bottom: 0.5rem;
  letter-spacing: -2px;
  line-height: 1.1;
  filter: drop-shadow(0 0 20px rgba(56, 189, 248, 0.45));
}

.sub-text {
  font-size: 2.8rem;
  font-weight: 900;
  text-transform: uppercase;
  background: linear-gradient(to right, #00f2fe, #4facfe, #00f2fe);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: metallic-shine 3s ease infinite alternate;
  filter: drop-shadow(0 0 12px rgba(5, 217, 232, 0.5));
  letter-spacing: 3px;
}



@keyframes bg-pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes gradient-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes container-float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-15px) scale(1.02);
  }
}



@media (max-width: 768px) {
  .message-container {
    padding: 2rem;
  }
  .congrats-text {
    font-size: 3.2rem;
    letter-spacing: -1px;
  }
  .sub-text {
    font-size: 1.8rem;
  }
}

.enter-btn {
  margin-top: 2rem;
  padding: 12px 36px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(45deg, #631efd, #e112a2);
  border: none;
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(99, 30, 253, 0.4);
  transition: all 0.3s ease;
  pointer-events: auto;
  letter-spacing: 1px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-transform: uppercase;
}

.enter-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 25px rgba(99, 30, 253, 0.7),
              0 0 15px rgba(225, 18, 162, 0.5);
}

.enter-btn:active {
  transform: scale(0.98);
}

.v2-link-btn {
  display: inline-block;
  margin-top: 2.5rem;
  padding: 16px 44px;
  font-size: 1.15rem;
  font-weight: 800;
  color: #38bdf8 !important;
  text-decoration: none;
  background: rgba(56, 189, 248, 0.04);
  backdrop-filter: blur(8px);
  border: 1.5px solid rgba(56, 189, 248, 0.35);
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.15);
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  pointer-events: auto;
  letter-spacing: 2px;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-transform: uppercase;
  animation: float-pulse-cyber 3s infinite ease-in-out;
}

.v2-link-btn:hover {
  transform: translateY(-6px) scale(1.04);
  color: #ffffff !important;
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  box-shadow: 0 0 30px rgba(56, 189, 248, 0.5),
              0 0 10px rgba(56, 189, 248, 0.3);
  animation: none;
}

.v2-link-btn:active {
  transform: translateY(-2px) scale(0.98);
}

.desc-text {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  line-height: 1.6;
  font-weight: 500;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

@keyframes float-pulse-cyber {
  0% {
    transform: translateY(0);
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.15);
    border-color: rgba(56, 189, 248, 0.35);
  }
  50% {
    transform: translateY(-5px);
    box-shadow: 0 0 25px rgba(56, 189, 248, 0.35), 0 0 8px rgba(56, 189, 248, 0.2);
    border-color: rgba(56, 189, 248, 0.7);
  }
  100% {
    transform: translateY(0);
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.15);
    border-color: rgba(56, 189, 248, 0.35);
  }
}

@keyframes metallic-shine {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
}

@media (max-width: 768px) {
  .desc-text {
    font-size: 1.05rem;
    margin-top: 1rem;
  }
}
</style>
