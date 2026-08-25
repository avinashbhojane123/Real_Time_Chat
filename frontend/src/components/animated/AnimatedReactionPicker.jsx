import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';

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

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉'];

export default function AnimatedReactionPicker({
  isOpen,
  onSelectEmoji,
  onClose,
  emojis = DEFAULT_EMOJIS,
  style = {},
}) {
  const [items, setItems] = useState(emojis);

  useEffect(() => {
    setItems(emojis);
  }, [emojis]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--m3-surface-container-highest, #202c33)',
            borderRadius: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 100,
            ...style,
          }}
        >
          <Reorder.Group
            axis="x"
            values={items}
            onReorder={setItems}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {items.map((emoji) => (
              <Reorder.Item
                key={emoji}
                value={emoji}
                whileDrag={{ scale: 1.4, zIndex: 10 }}
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
                  cursor: 'grab',
                  padding: '4px',
                  lineHeight: 1,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                }}
              >
                {emoji}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
