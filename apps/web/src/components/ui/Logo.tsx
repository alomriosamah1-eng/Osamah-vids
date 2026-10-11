import { motion } from 'framer-motion';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <motion.div
      initial={{ rotate: -30, scale: 0.8, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="relative grid place-items-center rounded-2xl bg-gradient-to-br from-accent-cyan via-accent-violet to-accent-amber"
      style={{
        width: size,
        height: size,
        boxShadow: '0 8px 30px -8px rgba(76,234,255,.6)',
      }}
    >
      {/* "V" from two nested rings — a video/clapper motif */}
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 8.5l4 7 4-7 4 7 4-7"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18.7" cy="16" r="1.6" fill="white" opacity="0.9" />
        <circle cx="5" cy="15.5" r="1.3" fill="white" opacity="0.7" />
      </svg>
    </motion.div>
  );
}