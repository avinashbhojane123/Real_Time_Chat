import { motion } from 'motion/react';

/**
 * AnimatedMessageBubble wraps individual chat message bubbles with:
 * 1. Spring physics entry animation (slide up, scale, opacity fade in)
 * 2. Exit scale-down animation
 * 3. Layout transition when adjacent messages are added/removed/edited
 * 4. Swipe-to-reply horizontal drag gesture
 */
export default function AnimatedMessageBubble({
  children,
  className = '',
  style = {},
  onSwipeReply,
  layoutId,
  isOwn = false,
}) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={{
        type: 'spring',
        stiffness: 450,
        damping: 30,
        mass: 0.8,
      }}
      drag={onSwipeReply ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: isOwn ? 0.4 : 0.1, right: isOwn ? 0.1 : 0.4 }}
      onDragEnd={(e, info) => {
        if (onSwipeReply) {
          const threshold = 50;
          if (info.offset.x > threshold || info.offset.x < -threshold) {
            onSwipeReply();
          }
        }
      }}
      whileTap={{ scale: 0.995 }}
      className={`animated-message-bubble ${className}`}
      style={{
        touchAction: 'pan-y',
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
