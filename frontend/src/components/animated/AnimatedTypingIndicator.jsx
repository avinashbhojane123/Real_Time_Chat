import { motion } from 'motion/react';

/**
 * AnimatedTypingIndicator renders wave-bouncing dots for live typing feedback.
 */
export default function AnimatedTypingIndicator({ typingUsers = [] }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const namesText =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing`
      : typingUsers.length === 2
      ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
      : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        fontSize: '0.82rem',
        color: 'var(--m3-on-surface-variant, #b0bec5)',
        margin: '6px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{
              y: ['0%', '-60%', '0%'],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              repeatType: 'loop',
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--m3-primary, #6366f1)',
              display: 'inline-block',
            }}
          />
        ))}
      </div>
      <span style={{ fontWeight: 500 }}>{namesText}...</span>
    </motion.div>
  );
}
