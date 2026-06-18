import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { appConfig } from '@/config/appConfig'
import logoImg from '@/assets/logo.png'

interface SplashScreenProps {
  onDone: () => void
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    // Logo fades in → holds → fades out → calls onDone
    const holdTimer = setTimeout(() => setPhase('hold'), 800)
    const outTimer  = setTimeout(() => setPhase('out'),  2200)
    const doneTimer = setTimeout(() => onDone(),          3000)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(outTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <AnimatePresence>
      {phase !== 'out' && (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: '#050508' }}
        >
          {/* Ambient glow behind logo */}
          <div style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.10) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }} />

          {/* Stars sprinkle */}
          {[...Array(18)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: Math.random() * 2 + 1,
                height: Math.random() * 2 + 1,
                borderRadius: '50%',
                background: 'white',
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
              }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}

          {/* Logo + Name */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="flex flex-col items-center gap-6 relative z-10"
          >
            {/* Logo image */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 140,
                height: 140,
                borderRadius: 32,
                overflow: 'hidden',
                boxShadow: '0 0 60px rgba(59,130,246,0.35), 0 0 120px rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,130,246,0.25)',
              }}
            >
              <img src={logoImg} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </motion.div>

            {/* App name */}
            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '2.8rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #93c5fd 0%, #818cf8 40%, #c4b5fd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '0.05em',
                  lineHeight: 1.5,
                  paddingBottom: '0.15em',
                }}
              >
                {appConfig.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.75rem',
                  letterSpacing: '0.25em',
                  color: 'rgba(147,197,253,0.55)',
                  marginTop: 8,
                  textTransform: 'uppercase',
                }}
              >
                {appConfig.tagline}
              </motion.p>
            </div>
          </motion.div>

          {/* Ripple ring */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 2.2, ease: 'easeOut', delay: 0.2 }}
            style={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: '50%',
              border: '1px solid rgba(99,130,246,0.4)',
            }}
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0.4 }}
            animate={{ scale: 2.8, opacity: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut', delay: 0.5 }}
            style={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: '50%',
              border: '1px solid rgba(147,197,253,0.25)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
