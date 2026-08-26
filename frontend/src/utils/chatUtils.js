export function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDateHeader(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (msgDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export function formatTimer(totalSeconds = 0) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatUserPresence(isOnline, lastSeenDate) {
  if (isOnline) return { text: 'online', isOnline: true };
  if (!lastSeenDate) return { text: 'offline', isOnline: false };

  const date = new Date(lastSeenDate);
  if (isNaN(date.getTime())) return { text: 'offline', isOnline: false };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (targetDate.getTime() === today.getTime()) {
    return { text: `last seen today at ${timeStr}`, isOnline: false };
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return { text: `last seen yesterday at ${timeStr}`, isOnline: false };
  } else {
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) {
      return { text: `last seen ${diffHours}h ago`, isOnline: false };
    }
    return {
      text: `last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`,
      isOnline: false,
    };
  }
}
