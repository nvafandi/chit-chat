import React, { useRef, useEffect } from 'react'

interface FireworksOverlayProps {
  mainText?: string
  subText?: string
  descText?: string
  showCloseButton?: boolean
  linkUrl?: string
  linkText?: string
  onClose?: () => void
}

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

export const FireworksOverlay: React.FC<FireworksOverlayProps> = ({
  mainText = 'CONGRATULATIONS',
  subText = '',
  descText = '',
  showCloseButton = false,
  linkUrl = '',
  linkText = '',
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const initAudio = () => {
      if (!(window as any).sharedAudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContextClass) {
          (window as any).sharedAudioCtx = new AudioContextClass()
        }
      }
      const audioCtx = (window as any).sharedAudioCtx
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume()
      }
      return audioCtx
    }

    const playLaunchSound = () => {
      const audioCtx = initAudio()
      if (!audioCtx || audioCtx.state !== 'running') return

      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      
      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(60, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 1.0)
      
      gainNode.gain.setValueAtTime(0.005, audioCtx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.15)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0)
      
      osc.start()
      osc.stop(audioCtx.currentTime + 1.0)
    }

    const playCrackleSound = (type: string) => {
      const audioCtx = initAudio()
      if (!audioCtx || audioCtx.state !== 'running') return
      const now = audioCtx.currentTime
      const duration = type === 'chrysanthemum' ? 0.9 : 0.4
      
      const bufferSize = audioCtx.sampleRate * duration
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let i = 0; i < bufferSize; i++) {
        const noise = Math.random() * 2 - 1
        const density = type === 'chrysanthemum' ? 0.96 : 0.93
        data[i] = Math.random() > density ? noise : 0
      }
      
      const noiseNode = audioCtx.createBufferSource()
      noiseNode.buffer = buffer
      
      const filter = audioCtx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 1800
      
      const gainNode = audioCtx.createGain()
      gainNode.gain.setValueAtTime(0.05, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
      
      noiseNode.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      
      noiseNode.start()
    }

    const playExplosionSound = (type: 'normal' | 'ring' | 'double' | 'chrysanthemum') => {
      const audioCtx = initAudio()
      if (!audioCtx || audioCtx.state !== 'running') return

      const now = audioCtx.currentTime

      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(100, now)
      osc.frequency.exponentialRampToValueAtTime(15, now + 0.55)

      const volume = type === 'chrysanthemum' ? 0.35 : type === 'double' ? 0.25 : 0.3
      gainNode.gain.setValueAtTime(volume, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

      osc.start()
      osc.stop(now + 0.6)

      if (type === 'chrysanthemum' || type === 'double' || Math.random() < 0.45) {
        playCrackleSound(type)
      }
    }

    initAudio()
    window.addEventListener('click', initAudio)
    window.addEventListener('touchstart', initAudio)

    const particles: Particle[] = []
    const fireworks: Firework[] = []
    const miniFireworks: MiniFirework[] = []
    const flashes: Flash[] = []

    const colors = [
      '#ff2a6d', '#05d9e8', '#f5a623', '#7ed321', '#f8e71c',
      '#bd10e0', '#9013fe', '#ff5e00', '#00ff66'
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

    let animationId: number

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

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('click', initAudio)
      window.removeEventListener('touchstart', initAudio)
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [])

  return (
    <div className="fireworks-overlay">
      <canvas ref={canvasRef} className="fireworks-canvas"></canvas>
      <div className="message-container">
        <h1 className="congrats-text">{mainText}</h1>
        <h2 className="sub-text">{subText}</h2>
        {descText && <p className="desc-text">{descText}</p>}
        {linkUrl && (
          <a 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="v2-link-btn"
          >
            {linkText || 'Visit Chit-Chut V2'}
          </a>
        )}
        {showCloseButton && onClose && (
          <button className="enter-btn" onClick={onClose}>ENTER APP</button>
        )}
      </div>
    </div>
  )
}

export default FireworksOverlay
