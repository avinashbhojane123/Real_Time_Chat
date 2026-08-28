import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { getSocketBaseUrl } from '../utils/apiConfig';
import { detectClientDevice, getBatteryInfo } from '../utils/deviceUtils';
import { compressImageFile } from '../utils/imageUtils';

export function useChatSocket({ nickname, passcode, baseUrl }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(true);
  const [socketLatency, setSocketLatency] = useState(18);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingTimersRef = useRef({});

  const showToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text: msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  useEffect(() => {
    if (!nickname || !passcode) return;

    const socketUrl = getSocketBaseUrl();
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', async () => {
      setIsSocketConnected(true);
      const startTime = Date.now();
      socket.emit('ping', () => {
        setSocketLatency(Math.max(8, Date.now() - startTime));
      });
      const clientDevice = detectClientDevice();
      const battery = await getBatteryInfo();
      socket.emit('joinRoom', {
        nickname,
        passcode,
        deviceType: clientDevice.deviceType,
        deviceModel: clientDevice.deviceModel,
        browser: clientDevice.browser,
        os: clientDevice.os,
        networkLabel: clientDevice.network?.label,
        batteryLabel: battery.label,
        batteryIsCharging: battery.isCharging,
      });
      socket.emit('getStatuses', { passcode });
      socket.emit('getUsers', { passcode });
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    // Chat History Event Listeners
    socket.on('chatHistory', (history) => {
      setMessages(history || []);
    });

    socket.on('roomHistory', (history) => {
      setMessages(history || []);
    });

    // New Message Event Listeners
    socket.on('newMessage', (msg) => {
      setMessages((prev) => {
        const clean = prev.filter(
          (m) => !(String(m.id).startsWith('temp-') && m.nickname === msg.nickname && m.message === msg.message)
        );
        if (clean.some((m) => String(m.id) === String(msg.id))) return clean;
        return [...clean, msg];
      });
    });

    socket.on('message', (msg) => {
      setMessages((prev) => {
        const clean = prev.filter(
          (m) => !(String(m.id).startsWith('temp-') && m.nickname === msg.nickname && m.message === msg.message)
        );
        if (clean.some((m) => String(m.id) === String(msg.id))) return clean;
        return [...clean, msg];
      });
    });

    // User List / Room Users Listeners
    socket.on('usersList', (userList) => {
      setUsers(userList || []);
    });

    socket.on('userList', (userList) => {
      setUsers(userList || []);
    });

    socket.on('roomUsers', (userList) => {
      setUsers(userList || []);
    });

    socket.on('userOnline', () => {
      socket.emit('getUsers', { passcode });
    });

    socket.on('userOffline', () => {
      socket.emit('getUsers', { passcode });
    });

    socket.on('userJoined', () => {
      socket.emit('getUsers', { passcode });
    });

    socket.on('userLeft', () => {
      socket.emit('getUsers', { passcode });
    });

    // Typing Listeners
    socket.on('userTyping', ({ nickname: typingUser }) => {
      if (typingUser && typingUser !== nickname) {
        setTypingUsers((prev) => (prev.includes(typingUser) ? prev : [...prev, typingUser]));

        if (typingTimersRef.current[typingUser]) {
          clearTimeout(typingTimersRef.current[typingUser]);
        }
        typingTimersRef.current[typingUser] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== typingUser));
          delete typingTimersRef.current[typingUser];
        }, 2500);
      }
    });

    socket.on('userStopTyping', ({ nickname: typingUser }) => {
      if (typingTimersRef.current[typingUser]) {
        clearTimeout(typingTimersRef.current[typingUser]);
        delete typingTimersRef.current[typingUser];
      }
      setTypingUsers((prev) => prev.filter((u) => u !== typingUser));
    });

    // Read Receipts Listener (Double Blue Ticks)
    socket.on('messagesRead', ({ messageIds, readByNick }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (messageIds && messageIds.includes(m.id)) {
            const currentReadBy = Array.isArray(m.readBy) ? m.readBy : [m.nickname];
            if (!currentReadBy.includes(readByNick)) {
              return { ...m, readBy: [...currentReadBy, readByNick] };
            }
          }
          return m;
        })
      );
    });

    // Reaction & Edit & Delete Listeners
    socket.on('messageReactionsUpdated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === String(messageId) ? { ...m, reactions } : m))
      );
    });

    socket.on('messageReaction', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === String(messageId) ? { ...m, reactions } : m))
      );
    });

    socket.on('messageEdited', ({ messageId, id, newMessage, message, fileUrl, isEdited }) => {
      const targetId = messageId ?? id;
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(targetId)
            ? {
                ...m,
                message: newMessage !== undefined ? newMessage : (message !== undefined ? message : m.message),
                fileUrl: fileUrl !== undefined ? fileUrl : m.fileUrl,
                isEdited: isEdited !== undefined ? isEdited : true,
              }
            : m
        )
      );
    });

    socket.on('messageUpdated', (updatedMsg) => {
      const targetId = updatedMsg.id ?? updatedMsg.messageId;
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === String(targetId) ? { ...m, ...updatedMsg } : m))
      );
    });

    socket.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId)));
    });

    socket.on('historyCleared', () => {
      setMessages([]);
      setPinnedMessage(null);
      showToast('Chat history cleared by admin');
    });

    socket.on('pinnedMessageUpdated', (msg) => {
      setPinnedMessage(msg);
      if (msg) showToast(`Pinned message by ${msg.nickname}`);
      else showToast('Message unpinned');
    });

    // Helper to filter 24h statuses
    const filter24hStatuses = (list) => {
      if (!Array.isArray(list)) return [];
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return list.filter((st) => {
        const timeVal = st?.createdAt || st?.timestamp;
        if (!timeVal) return true;
        return new Date(timeVal).getTime() >= cutoff;
      });
    };

    // Status Story Event Listeners
    socket.on('statusesList', (list) => {
      setStatuses(filter24hStatuses(list));
    });

    socket.on('statusesUpdated', (updatedStatuses) => {
      setStatuses(filter24hStatuses(updatedStatuses));
    });

    socket.on('statusCreated', (newStatus) => {
      setStatuses((prev) => filter24hStatuses([newStatus, ...prev]));
      showToast(`${newStatus.nickname} posted a new status story`);
    });

    socket.on('statusDeleted', ({ statusId }) => {
      setStatuses((prev) => prev.filter((s) => String(s.id) !== String(statusId)));
    });

    socket.on('statusViewed', ({ statusId, viewers }) => {
      setStatuses((prev) =>
        prev.map((s) => {
          if (String(s.id) === String(statusId)) {
            return { ...s, viewers: viewers || [], viewedBy: viewers || [] };
          }
          return s;
        })
      );
    });

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [nickname, passcode]);

  const handleMarkAsRead = (messageIds) => {
    if (socketRef.current && messageIds && messageIds.length > 0) {
      socketRef.current.emit('markRead', {
        passcode,
        nickname,
        messageIds,
      });
    }
  };

  const handleInputChangeEmitter = (val) => {
    if (socketRef.current) {
      if (val && val.trim() !== '') {
        socketRef.current.emit('typing', { passcode, nickname });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current?.emit('stopTyping', { passcode, nickname });
        }, 2000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socketRef.current.emit('stopTyping', { passcode, nickname });
      }
    }
  };

  const handleCreateStatus = (statusData) => {
    socketRef.current?.emit('createStatus', {
      passcode,
      nickname,
      ...statusData,
    });
  };

  const handleViewStatus = (statusId) => {
    socketRef.current?.emit('viewStatus', {
      passcode,
      statusId,
    });
  };

  const handleDeleteStatus = (statusId) => {
    socketRef.current?.emit('deleteStatus', {
      passcode,
      statusId,
    });
  };

  const handleReplyStatus = ({ status, message }, disappearingTimer) => {
    if (!status || !message) return;

    let statusSnippet = status.content;
    if (!statusSnippet) {
      if (status.type === 'image') statusSnippet = '📷 Photo';
      else if (status.type === 'video') statusSnippet = '🎥 Video';
      else statusSnippet = 'Status Story';
    }

    const replyMsg = {
      passcode,
      nickname,
      message,
      replyTo: {
        id: `status-${status.id || Date.now()}`,
        nickname: status.nickname,
        message: statusSnippet,
        isStatus: true,
        statusType: status.type,
        statusMediaUrl: status.mediaUrl || null,
        statusBgColor: status.bgColor || null,
      },
      expiresIn: null,
    };

    socketRef.current?.emit('sendMessage', replyMsg);
    showToast(`Replied to ${status.nickname}'s status`);
  };

  const handleDeleteMessage = (msgId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socketRef.current?.emit('deleteMessage', {
        passcode,
        messageId: msgId,
      });
    }
  };

  const handleClearHistory = () => {
    socketRef.current?.emit('clearHistory', { passcode });
  };

  const handleTogglePinMessage = (msg) => {
    if (pinnedMessage && pinnedMessage.id === msg.id) {
      socketRef.current?.emit('pinMessage', { passcode, messageId: null });
    } else {
      socketRef.current?.emit('pinMessage', { passcode, messageId: msg.id });
    }
  };

  const handleVotePoll = (messageId, optionId) => {
    socketRef.current?.emit('votePoll', {
      passcode,
      nickname,
      messageId,
      optionId,
    });
  };

  const handleReactToMessage = (messageId, emoji) => {
    const numericId = typeof messageId === 'number' ? messageId : (parseInt(messageId, 10) || messageId);

    // Optimistic UI state update (0ms instant visual feedback)
    setMessages((prev) =>
      prev.map((m) => {
        if (String(m.id) !== String(messageId)) return m;
        let reactions = m.reactions;

        if (!reactions || typeof reactions !== 'object') {
          reactions = {};
        }

        let newReactions;
        if (Array.isArray(reactions)) {
          const hasReacted = reactions.some((r) => r.nickname === nickname && r.emoji === emoji);
          if (hasReacted) {
            newReactions = reactions.filter((r) => !(r.nickname === nickname && r.emoji === emoji));
          } else {
            newReactions = [...reactions, { nickname, emoji }];
          }
        } else {
          const map = { ...reactions };
          let users = Array.isArray(map[emoji]) ? [...map[emoji]] : [];
          if (users.includes(nickname)) {
            users = users.filter((u) => u !== nickname);
          } else {
            users.push(nickname);
          }
          if (users.length === 0) {
            delete map[emoji];
          } else {
            map[emoji] = users;
          }
          newReactions = Object.keys(map).length > 0 ? map : null;
        }
        return { ...m, reactions: newReactions };
      })
    );

    socketRef.current?.emit('reactToMessage', {
      passcode,
      nickname,
      messageId: numericId,
      emoji,
    });
    socketRef.current?.emit('reactMessage', {
      passcode,
      nickname,
      messageId: numericId,
      emoji,
    });
  };

  const handleFileUpload = async (e, disappearingTimer) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    setIsUploadingFile(true);
    try {
      const file = await compressImageFile(rawFile);
      const formData = new FormData();
      formData.append('file', file);

      const cleanApiUrl = baseUrl.trim().replace(/\/+$/, '');
      const res = await axios.post(`${cleanApiUrl}/upload`, formData);

      if (res.data && res.data.fileUrl) {
        let fullFileUrl = res.data.fileUrl;
        if (
          !fullFileUrl.startsWith('http://') &&
          !fullFileUrl.startsWith('https://') &&
          !fullFileUrl.startsWith('data:')
        ) {
          const serverBaseUrl = cleanApiUrl.replace(/\/api\/?$/, '');
          fullFileUrl = `${serverBaseUrl}${fullFileUrl.startsWith('/') ? '' : '/'}${fullFileUrl}`;
        }

        const derivedFileType = file.type || (
          /\.(jpg|jpeg|png|gif|webp|svg|avif|heic|bmp)$/i.test(file.name)
            ? 'image/jpeg'
            : /\.(mp4|webm|mov|m4v)$/i.test(file.name)
            ? 'video/mp4'
            : /\.(mp3|wav|ogg|aac|m4a)$/i.test(file.name)
            ? 'audio/mpeg'
            : 'application/octet-stream'
        );

        const payload = {
          passcode,
          nickname,
          message: '',
          fileUrl: fullFileUrl,
          fileName: file.name,
          fileType: derivedFileType,
          expiresIn: null,
        };
        socketRef.current?.emit('sendMessage', payload);
        showToast('File attached & sent');
      }
    } catch (err) {
      showToast('File upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleShareLocation = (disappearingTimer) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    showToast('Getting current location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const payload = {
          passcode,
          nickname,
          message: '📍 Shared Live Location',
          locationData: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
        };
        socketRef.current?.emit('sendMessage', payload);
        showToast('Location shared in space');
      },
      (err) => {
        showToast('Could not retrieve location: ' + err.message);
      }
    );
  };

  const handleCreatePoll = (pollQuestion, pollOptions, disappearingTimer, onSuccess) => {
    if (!pollQuestion.trim()) {
      alert('Please enter a question for the poll.');
      return;
    }
    const cleanOpts = pollOptions.filter((o) => o.trim() !== '');
    if (cleanOpts.length < 2) {
      alert('Please enter at least 2 options for the poll.');
      return;
    }

    const payload = {
      passcode,
      nickname,
      message: `📊 Poll: ${pollQuestion}`,
      pollData: {
        question: pollQuestion.trim(),
        options: cleanOpts.map((opt, i) => ({ id: `opt-${i}`, text: opt.trim(), votes: [] })),
      },
      expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
    };

    socketRef.current?.emit('sendMessage', payload);
    showToast('Live Poll created!');
    if (onSuccess) onSuccess();
  };

  return {
    messages,
    setMessages,
    users,
    statuses,
    typingUsers,
    toasts,
    pinnedMessage,
    isUploadingFile,
    socketRef,
    showToast,
    handleInputChangeEmitter,
    handleCreateStatus,
    handleViewStatus,
    handleDeleteStatus,
    handleReplyStatus,
    handleDeleteMessage,
    handleClearHistory,
    handleTogglePinMessage,
    handleVotePoll,
    handleReactToMessage,
    handleFileUpload,
    handleShareLocation,
    handleCreatePoll,
    handleMarkAsRead,
    isSocketConnected,
    socketLatency,
  };
}
