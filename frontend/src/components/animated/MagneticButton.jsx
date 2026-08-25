import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

/**
 * MagneticButton magnetically pulls toward the pointer on hover.
 */
export default function MagneticButton({
  children,
  className = '',
  style = {},
  onClick,
  disabled = false,
  type = 'button',
  title = '',
  magneticStrength = 0.35,
}) {
  const ref = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 350, damping: 20, mass: 0.5 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e) => {
    if (!ref.current || disabled) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const distanceX = (e.clientX - centerX) * magneticStrength;
    const distanceY = (e.clientY - centerY) * magneticStrength;

    x.set(distanceX);
    y.set(distanceY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      title={title}
      className={className}
      style={{
        x: springX,
        y: springY,
        cursor: disabled ? 'not-allowed' : 'pointer',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}
