import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [currentText, setCurrentText] = useState("");
  const [progress, setProgress] = useState(0);
  const [isGlitching, setIsGlitching] = useState(true);
  const [isSequenceFinished, setIsSequenceFinished] = useState(false);

  useEffect(() => {
    let glitchTimeout: any;
    let stableTimeout: any;

    const cycleGlitch = () => {
      setIsGlitching(true);
      glitchTimeout = setTimeout(() => {
        setIsGlitching(false);
        stableTimeout = setTimeout(cycleGlitch, 3500); // 3.5s stable
      }, 1000); // 1s glitch
    };

    cycleGlitch();

    return () => {
      clearTimeout(glitchTimeout);
      clearTimeout(stableTimeout);
    };
  }, []);

  useEffect(() => {
    const startupSequence = [
      "INITIALIZING SECURE KERNEL...",
      "LOADING CRYPTOGRAPHIC MODULES...",
      "MOUNTING ENCRYPTED VOLUMES...",
      "ESTABLISHING SECURE CONNECTION...",
      "BYPASSING FIREWALL PROTOCOLS...",
      "ACCESSING SECURE MAINFRAME...",
      "AUTHENTICATION SUCCESSFUL",
    ];

    let currentLog = 0;
    setCurrentText(startupSequence[0]);
    
    const interval = setInterval(() => {
      currentLog++;
      if (currentLog < startupSequence.length) {
        setCurrentText(startupSequence[currentLog]);
        setProgress((currentLog / (startupSequence.length - 1)) * 100);
      } else {
        clearInterval(interval);
        setIsSequenceFinished(true);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      className="fixed inset-0 z-[100] bg-[#030303] flex flex-col items-center justify-center font-mono overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Refined subtle background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#030303]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)] z-10"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,_transparent_1px)] bg-[size:100%_4px] z-20"></div>
        <div className="absolute inset-0 tv-static-layer z-30"></div>
      </div>

      <div className="z-10 flex flex-col items-center w-full max-w-md px-6">
        <motion.div
          className="relative z-20 flex flex-col items-center justify-center -mb-12 translate-y-12 h-8"
          initial={{ scale: 0.95, opacity: 0, filter: "blur(8px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        >
          <span 
            className={`text-[10px] sm:text-[11px] tracking-[0.3em] font-medium uppercase drop-shadow-[0_0_8px_var(--neon-green-dim-val)] transform-gpu ${isGlitching ? 'text-glitch text-glitch-color' : 'text-neon-green'}`}
            style={{ fontFamily: "'JetBrains Mono', monospace", willChange: 'transform, opacity' }}
            data-text="DEVELOPED BY K4N3CO.LABS"
          >
            DEVELOPED BY K4N3CO.LABS
          </span>
        </motion.div>

        <motion.div 
          className="relative mb-6 w-full max-w-[312px]"
          initial={{ scale: 0.95, opacity: 0, filter: "blur(8px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <motion.div 
            className="absolute inset-[10%] -z-10 bg-black rounded-full blur-[15px]" 
          />
          <motion.div 
            className="absolute -inset-[60%] -z-20 origin-center"
            style={{
               background: 'radial-gradient(circle, transparent 25%, rgba(0, 255, 204, 0.12) 40%, transparent 60%)'
            }}
            animate={{ 
              opacity: [0.6, 1, 0.6],
              scale: [1, 1.15, 1] 
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div 
            className="w-full aspect-square relative z-10 drop-shadow-xl contrast-110 brightness-110 transition-all duration-300"
            style={{ backgroundImage: 'url(https://i.postimg.cc/FsFhjMXz/Screenshot-20260528-172644-Bazaart.jpg)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
          >
          </div>
        </motion.div>

        {/* EKG / Heartbeat Monitor */}
        <motion.div 
          className="w-full max-w-[340px] h-16 relative z-20 mx-auto -mt-24 mb-4 opacity-80 transform-gpu"
          style={{ willChange: 'transform, opacity' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.4, duration: 1 }}
        >
          <svg viewBox="0 0 340 40" className="w-full h-full stroke-neon-green overflow-visible" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,204,0.6))' }}>
            <motion.path 
              d="M 0 20 L 40 20 L 45 10 L 50 30 L 55 20 L 100 20 L 110 -15 L 120 45 L 125 20 L 170 20 L 175 15 L 180 25 L 185 20 L 230 20 L 235 5 L 240 35 L 245 20 L 290 20 L 295 -5 L 305 35 L 310 20 L 340 20"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{ ease: "easeOut", duration: 0.4 }}
            />
            {/* Dim background line */}
            <path 
              d="M 0 20 L 40 20 L 45 10 L 50 30 L 55 20 L 100 20 L 110 -15 L 120 45 L 125 20 L 170 20 L 175 15 L 180 25 L 185 20 L 230 20 L 235 5 L 240 35 L 245 20 L 290 20 L 295 -5 L 305 35 L 310 20 L 340 20"
              className="stroke-neon-green/10"
            />
          </svg>
        </motion.div>

        <motion.div 
          className="text-center mb-12 relative z-10"
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <p className="text-gray-400 font-medium text-sm tracking-[0.3em] uppercase glow-text text-shadow-sm">Advanced Network Exploitation Toolkit</p>
        </motion.div>

        <div className="w-full max-w-[240px] flex flex-col items-center min-h-[48px] justify-center">
          <AnimatePresence mode="wait">
            {!isSequenceFinished ? (
              <motion.div
                key="loading-text"
                className="text-[9px] text-gray-500 font-medium tracking-widest uppercase h-4"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                {currentText}
              </motion.div>
            ) : (
              <motion.button
                key="dispatch-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: 'blur(0px)',
                  boxShadow: [
                    '0 0 10px rgba(0, 255, 204, 0.2)',
                    '0 0 25px rgba(0, 255, 204, 0.5)',
                    '0 0 10px rgba(0, 255, 204, 0.2)'
                  ]
                }}
                transition={{
                  opacity: { duration: 0.5 },
                  scale: { duration: 0.5 },
                  boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-neon-green text-black px-5 py-3.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all border border-white/20 active:bg-white z-[110] relative min-w-[180px]"
              >
                Dispatch Toolkit
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
