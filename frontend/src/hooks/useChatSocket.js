import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { getSocketBaseUrl } from '../utils/apiConfig';
import { detectClientDevice } from '../utils/deviceUtils';

export function useChatSocket({ nickname, passcode, baseUrl }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

    socket.on('connect', () => {
      const clientDevice = detectClientDevice();
      socket.emit('joinRoom', {
        nickname,
        passcode,
        deviceType: clientDevice.deviceType,
        deviceModel: clientDevice.deviceModel,
        browser: clientDevice.browser,
        os: clientDevice.os,
      });
      socket.emit('getStatuses', { passcode });
      socket.emit('getUsers', { passcode });
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
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('message', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
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
      }
    });

    socket.on('userStopTyping', ({ nickname: typingUser }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== typingUser));
    });

    // Reaction & Edit & Delete Listeners
    socket.on('messageReaction', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    socket.on('messageUpdated', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
    });

    socket.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
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

    // Status Story Event Listeners
    socket.on('statusesUpdated', (updatedStatuses) => {
      setStatuses(updatedStatuses || []);
    });

    socket.on('statusCreated', (newStatus) => {
      setStatuses((prev) => [newStatus, ...prev]);
      showToast(`${newStatus.nickname} posted a new status story`);
    });

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [nickname, passcode]);

  const handleInputChangeEmitter = (val) => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { passcode, nickname });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stopTyping', { passcode, nickname });
      }, 2000);
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
      expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
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
    socketRef.current?.emit('reactMessage', {
      passcode,
      nickname,
      messageId,
      emoji,
    });
  };

  const handleFileUpload = async (e, disappearingTimer) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const cleanApiUrl = baseUrl.trim().replace(/\/+$/, '');
      const res = await axios.post(`${cleanApiUrl}/upload`, formData);

      if (res.data && res.data.fileUrl) {
        const payload = {
          passcode,
          nickname,
          message: '',
          fileUrl: res.data.fileUrl,
          fileName: file.name,
          fileType: file.type,
          expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
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
  };
}
