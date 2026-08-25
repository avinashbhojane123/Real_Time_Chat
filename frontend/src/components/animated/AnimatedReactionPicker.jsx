import { motion, AnimatePresence } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25,
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 8,
    transition: { duration: 0.12 },
  },
};

const emojiVariants = {
  hidden: { opacity: 0, scale: 0.4, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 500, damping: 20 },
  },
};

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉'];

export default function AnimatedReactionPicker({
  isOpen,
  onSelectEmoji,
  onClose,
  emojis = DEFAULT_EMOJIS,
  style = {},
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: 'var(--m3-surface-container-highest, #202c33)',
            borderRadius: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 100,
            ...style,
          }}
        >
          {emojis.map((emoji) => (
            <motion.button
              key={emoji}
              variants={emojiVariants}
              whileHover={{ scale: 1.35, y: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                onSelectEmoji(emoji);
                if (onClose) onClose();
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
