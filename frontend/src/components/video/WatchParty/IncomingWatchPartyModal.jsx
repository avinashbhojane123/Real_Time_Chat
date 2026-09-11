import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import { playMovieInviteChime } from '../../../utils/audioAlert';
import './IncomingWatchPartyModal.css';

export default function IncomingWatchPartyModal({
  invite,
  onAccept,
  onDecline,
}) {
  useEffect(() => {
    if (invite) {
      playMovieInviteChime();
    }
  }, [invite]);

  if (!invite) return null;

  return (
    <AnimatePresence>
      <div className="incoming-wp-overlay">
        <motion.div
          className="incoming-wp-card"
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 450, damping: 26 }}
        >
          {/* Ambient Glow */}
          <div className="incoming-wp-glow" />

          {/* Animated Popcorn Avatar with Pulsing Ripple */}
          <div className="incoming-wp-icon-wrapper">
            <span className="incoming-wp-ripple" />
            <span role="img" aria-label="popcorn">🍿</span>
          </div>

          {/* Invitation Title & Subtitle */}
          <div className="incoming-wp-title">Movie Night Invitation! 🎬</div>
          <div className="incoming-wp-subtitle">
            <span className="incoming-wp-sender-tag">{invite.from}</span> invited you to watch a movie together in perfect sync!
          </div>

          {/* Selected Movie Info Card */}
          <div className="incoming-wp-movie-box">
            <div className="incoming-wp-movie-icon">
              <Icon icon="solar:clapperboard-play-bold-duotone" width="24" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="incoming-wp-movie-title">
                {invite.videoSource?.title || 'Synchronized Movie Stream'}
              </div>
              <div className="incoming-wp-movie-sub">
                Zero-Lag Buffer Sync • Starts Directly
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="incoming-wp-actions">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="incoming-wp-btn-accept"
              onClick={onAccept}
              autoFocus
            >
              <Icon icon="solar:play-bold" width="18" />
              <span>Accept & Watch Now</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="incoming-wp-btn-decline"
              onClick={onDecline}
            >
              <Icon icon="line-md:close" width="16" />
              <span>Decline</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
