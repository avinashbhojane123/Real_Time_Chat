// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';

// const API_URL =
//   (import.meta as any).env?.VITE_API_URL ||
//   '/api';

// function JoinRoom() {
//   const navigate = useNavigate();

//   const [nickname, setNickname] = useState('');
//   const [passcode, setPasscode] = useState('');
//   const [loading, setLoading] = useState(false);

//   const joinRoom = async () => {
//     if (!nickname.trim() || !passcode.trim()) {
//       alert('Please enter nickname and passcode');
//       return;
//     }

//     try {
//       setLoading(true);

//       const { data } = await axios.post(
//         `${API_URL}/rooms/join`,
//         {
//           nickname: nickname.trim(),
//           passcode: passcode.trim(),
//         },
//       );

//       localStorage.setItem(
//         'nickname',
//         nickname.trim(),
//       );

//       localStorage.setItem(
//         'passcode',
//         passcode.trim(),
//       );

//       if (data?.room?.id) {
//         localStorage.setItem(
//           'roomId',
//           data.room.id.toString(),
//         );
//       }

//       navigate('/chat');
//     } catch (error: any) {
//       console.error(error);

//       alert(
//         error?.response?.data?.message ||
//           'Unable to join room',
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container">
//       <div
//         className="row justify-content-center align-items-center"
//         style={{ minHeight: '100vh' }}
//       >
//         <div className="col-md-5">
//           <div className="card shadow">
//             <div className="card-body p-4">
//               <h2 className="text-center mb-4">
//                 Passcode Chat
//               </h2>

//               <div className="mb-3">
//                 <label className="form-label">
//                   Nickname
//                 </label>

//                 <input
//                   type="text"
//                   className="form-control"
//                   placeholder="Enter nickname"
//                   value={nickname}
//                   onChange={(e) =>
//                     setNickname(e.target.value)
//                   }
//                   onKeyDown={(e) => {
//                     if (e.key === 'Enter') {
//                       joinRoom();
//                     }
//                   }}
//                 />
//               </div>

//               <div className="mb-4">
//                 <label className="form-label">
//                   Room Passcode
//                 </label>

//                 <input
//                   type="text"
//                   className="form-control"
//                   placeholder="Enter passcode"
//                   value={passcode}
//                   onChange={(e) =>
//                     setPasscode(e.target.value)
//                   }
//                   onKeyDown={(e) => {
//                     if (e.key === 'Enter') {
//                       joinRoom();
//                     }
//                   }}
//                 />
//               </div>

//               <button
//                 className="btn btn-primary w-100"
//                 onClick={joinRoom}
//                 disabled={loading}
//               >
//                 {loading
//                   ? 'Joining...'
//                   : 'Join Room'}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default JoinRoom;




import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SOCKET_URL =
  (import.meta as any).env?.VITE_SOCKET_URL ||
  'https://backend-9i6w.onrender.com';

export default function JoinRoom() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);

  const joinRoom = async () => {
    if (!nickname.trim() || !passcode.trim()) {
      alert('Please enter nickname and passcode');
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.post(`${API_URL}/rooms/join`, {
        nickname: nickname.trim(),
        passcode: passcode.trim(),
      });

      localStorage.setItem('nickname', nickname.trim());
      localStorage.setItem('passcode', passcode.trim());
      if (data?.room?.id) {
        localStorage.setItem('roomId', data.room.id.toString());
      }
      navigate('/chat');
    } catch (error: any) {
      console.error(error);
      alert(error?.response?.data?.message || 'Unable to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-wrap">
      <div className="orb o1" />
      <div className="orb o2" />
      
      <div className="glass-card">
        <div className="brand">
          <div className="logo neu">PC</div>
          <h1>Passcode Chat</h1>
          <p>Enter a nickname and room passcode to continue</p>
        </div>

        <div className="field">
          <label>Nickname</label>
          <input
            className="neu-in"
            type="text"
            placeholder="Enter Nickname "
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Room Passcode</label>
          <input
            className="neu-in"
            type="text"
            placeholder="Enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
        </div>

        <button className="neu-btn join" onClick={joinRoom} disabled={loading}>
          {loading ? (
            <span className="spinner" />
          ) : (
            'Join Room'
          )}
        </button>

        <div className="hint">Tip: share the same passcode with friends to join instantly</div>
      </div>

      <style>{`
        .join-wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: radial-gradient(1200px 800px at 15% 10%, #9b8cff 0%, transparent 60%),
                      radial-gradient(1000px 700px at 85% 20%, #5ee7df 0%, transparent 55%),
                      linear-gradient(135deg, #1a1440 0%, #0f0b2a 100%);
          color: #e9ecff;
          font-family: Inter, system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .orb {
          position: absolute;
          filter: blur(60px);
          opacity: 0.6;
          border-radius: 50%;
          z-index: 0;
        }
        .o1 { width: 320px; height: 320px; background: #7c4dff; top: -60px; left: -60px; }
        .o2 { width: 280px; height: 280px; background: #00e5ff; bottom: -40px; right: -40px; }

        .glass-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          padding: 32px;
          border-radius: 28px;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 30px 80px rgba(0,0,0,0.45);
        }
        .brand { text-align: center; margin-bottom: 24px; }
        .logo {
          width: 56px; height: 56px; margin: 0 auto 12px;
          display: grid; place-items: center;
          border-radius: 16px;
          font-weight: 800; color: #0f0b2a;
          background: #e6e9f5;
        }
        .brand h1 { margin: 0; font-size: 24px; letter-spacing: 0.3px; }
        .brand p { margin: 6px 0 0; font-size: 13px; opacity: 0.75; }

        .field { margin-bottom: 18px; }
        .field label {
          display: block;
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 8px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .neu-in {
          width: 100%;
          padding: 14px 18px;
          border-radius: 16px;
          border: none;
          outline: none;
          color: #e9ecff;
          background: rgba(0,0,0,0.25);
          box-shadow: inset 8px 8px 16px rgba(0,0,0,0.35), inset -8px -8px 16px rgba(255,255,255,0.05);
          transition: box-shadow 0.2s ease;
        }
        .neu-in:focus {
          box-shadow: inset 6px 6px 12px rgba(0,0,0,0.4), inset -6px -6px 12px rgba(255,255,255,0.08), 0 0 0 2px rgba(124,255,178,0.25);
        }
        .neu-in::placeholder { color: rgba(233,236,255,0.5); }

        .neu, .neu-btn {
          background: #e6e9f5;
          box-shadow: 8px 8px 16px rgba(0,0,0,0.35), -8px -8px 16px rgba(255,255,255,0.08);
        }
        .neu-btn {
          width: 100%;
          padding: 14px 20px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          font-weight: 700;
          color: #0f0b2a;
          margin-top: 6px;
          transition: transform 0.08s ease, opacity 0.2s;
        }
        .neu-btn:active { transform: translateY(1px); box-shadow: inset 6px 6px 12px rgba(0,0,0,0.25), inset -6px -6px 12px rgba(255,255,255,0.7); }
        .neu-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .join { margin-top: 8px; }

        .hint {
          text-align: center;
          font-size: 11px;
          opacity: 0.6;
          margin-top: 16px;
        }
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(15,11,42,0.2);
          border-top-color: #0f0b2a;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
