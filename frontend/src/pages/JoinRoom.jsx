import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/apiConfig';

export default function JoinRoom() {
  const navigate = useNavigate();

  // Stealth Job Application State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Secret Room Passcode Portal State
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [baseUrl, setBaseUrl] = useState(
    localStorage.getItem('baseUrl') || getApiBaseUrl()
  );
  const [nickname, setNickname] = useState(localStorage.getItem('nickname') || '');
  const [passcode, setPasscode] = useState(localStorage.getItem('passcode') || '');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatarUrl') || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const cleanApiUrl = baseUrl.replace(/\/+$/, '');
      const res = await axios.post(`${cleanApiUrl}/upload`, formData);
      if (res.data && res.data.fileUrl) {
        setAvatarUrl(res.data.fileUrl);
        localStorage.setItem('avatarUrl', res.data.fileUrl);
      }
    } catch (err) {
      setError('Avatar upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleJobSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setAppliedSuccess(true);
  };

  const handleSecretJoin = (e) => {
    e.preventDefault();
    const finalNickname = nickname.trim() || fullName.trim() || 'Candidate';
    if (!passcode.trim()) {
      setError('Room Passcode is required');
      return;
    }
    localStorage.setItem('baseUrl', baseUrl.trim());
    localStorage.setItem('nickname', finalNickname);
    localStorage.setItem('passcode', passcode.trim());
    if (avatarUrl) localStorage.setItem('avatarUrl', avatarUrl);
    navigate('/chat');
  };

  return (
    <div style={{ backgroundColor: 'var(--m3-background)', color: 'var(--m3-on-background)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Corporate Header */}
      <header
        style={{
          backgroundColor: 'var(--m3-surface-container-low)',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--m3-outline-variant)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--m3-primary)', fontSize: '32px' }}>domain</span>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--m3-on-surface)' }}>NEXUS GLOBAL SYSTEMS</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--m3-on-surface-variant)' }}>Careers & Engineering Talent Portal</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--m3-on-surface-variant)' }}>Req ID: #ENG-2026-X9</span>
          
          {/* Discrete Hidden Corner Button for Secret Access */}
          <button
            onClick={() => {
              setNickname((prev) => prev || fullName.split(' ')[0] || '');
              setShowSecretModal(true);
            }}
            title="System Diagnostics"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--m3-outline)',
              opacity: 0.35,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.35')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
          </button>
        </div>
      </header>

      {/* Main Career Portal Layout */}
      <main style={{ flex: 1, maxWdith: '1000px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        {/* Job Banner Card */}
        <div className="m3-card" style={{ marginBottom: '32px', borderLeft: '6px solid var(--m3-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--m3-primary)', fontWeight: 700 }}>
                Full-Time Engineering Position
              </span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--m3-on-surface)' }}>
                Senior Full-Stack Software Engineer (Real-Time Systems)
              </h2>
              <p style={{ color: 'var(--m3-on-surface-variant)', fontSize: '0.95rem', marginTop: '6px' }}>
                Remote / San Francisco, CA • Distributed Web & Real-Time Media Architecture
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--m3-primary-container)', color: 'var(--m3-on-primary-container)', padding: '8px 16px', borderRadius: 'var(--m3-radius-full)', fontWeight: 600, fontSize: '0.875rem' }}>
              Accepting Applications
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '24px', fontSize: '0.875rem', color: 'var(--m3-on-surface-variant)', flexWrap: 'wrap' }}>
            <span>💼 <strong>Department:</strong> Core Platform Engineering</span>
            <span>⚡ <strong>Tech Stack:</strong> TypeScript, Node.js, WebRTC, Socket.io</span>
            <span>💰 <strong>Salary Range:</strong> $165,000 - $210,000 USD</span>
          </div>
        </div>

        {/* Application Form & Details Split View */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Form Card */}
          <div className="m3-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--m3-primary)' }}>
              Candidate Application Form
            </h3>

            {appliedSuccess ? (
              <div style={{ padding: '24px', backgroundColor: 'var(--m3-surface-container-high)', borderRadius: 'var(--m3-radius-m)', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#81c784', marginBottom: '12px' }}>check_circle</span>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Application Received!</h4>
                <p style={{ color: 'var(--m3-on-surface-variant)', fontSize: '0.9rem', marginTop: '8px' }}>
                  Thank you, <strong>{fullName}</strong>. Our engineering recruitment team will review your credentials and contact you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleJobSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    className="m3-text-field"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    className="m3-text-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.jenkins@example.com"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="m3-text-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
                    GitHub / Portfolio URL
                  </label>
                  <input
                    type="url"
                    className="m3-text-field"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://github.com/username"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
                    Upload Resume (PDF / DOCX)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="resume-upload-input"
                  />
                  <label htmlFor="resume-upload-input" className="m3-btn m3-btn-outlined" style={{ width: '100%', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined">upload_file</span>
                    {resumeFile ? resumeFile.name : 'Select Resume File'}
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
                    Cover Letter & Relevant Experience
                  </label>
                  <textarea
                    className="m3-text-field"
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Briefly describe your experience with WebSockets, WebRTC, and real-time backend microservices..."
                  />
                </div>

                <button type="submit" className="m3-btn m3-btn-filled" style={{ padding: '14px 24px', fontSize: '1rem' }}>
                  <span className="material-symbols-outlined">send</span>
                  Submit Application
                </button>
              </form>
            )}
          </div>

          {/* Job Overview Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="m3-card">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m3-primary)', marginBottom: '12px' }}>
                Role Responsibilities
              </h4>
              <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--m3-on-surface-variant)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Architect high-throughput real-time messaging services with Socket.io and NestJS.</li>
                <li>Implement peer-to-peer WebRTC video stream signaling and Picture-in-Picture mode handlers.</li>
                <li>Design secure streaming APIs and media preview proxy controllers.</li>
                <li>Maintain 99.99% uptime SLA across Render and cloud cluster deployments.</li>
              </ul>
            </div>

            <div className="m3-card">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m3-primary)', marginBottom: '12px' }}>
                Engineering Culture & Benefits
              </h4>
              <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--m3-on-surface-variant)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>100% Remote-First Culture with flexible working hours.</li>
                <li>Comprehensive Health, Dental, & Vision Insurance.</li>
                <li>Annual $3,000 Learning & Hardware Stipend.</li>
                <li>Unlimited Paid Time Off (PTO) with mandatory minimums.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Secret Room Passcode Modal */}
      {showSecretModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="m3-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--m3-surface-container-highest)',
              borderRadius: 'var(--m3-radius-xl)',
              boxShadow: 'var(--m3-elevation-3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--m3-primary)' }}>vpn_key</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--m3-on-surface)' }}>Secret Space Portal</h3>
              </div>
              <button
                className="m3-btn m3-btn-icon m3-btn-outlined"
                onClick={() => setShowSecretModal(false)}
                style={{ width: '36px', height: '36px' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: 'var(--m3-error-container)',
                  color: 'var(--m3-on-error)',
                  padding: '10px 14px',
                  borderRadius: 'var(--m3-radius-m)',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSecretJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '4px' }}>
                  User Nickname
                </label>
                <input
                  type="text"
                  className="m3-text-field"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your nickname"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '4px' }}>
                  Room Passcode
                </label>
                <input
                  type="password"
                  className="m3-text-field"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '4px' }}>
                  Avatar Image (Optional)
                </label>
                <input type="file" onChange={handleAvatarUpload} accept="image/*" id="secret-avatar-upload" style={{ display: 'none' }} />
                <label htmlFor="secret-avatar-upload" className="m3-btn m3-btn-outlined" style={{ width: '100%', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined">upload_file</span>
                  {uploading ? 'Uploading...' : avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
                </label>
              </div>

              <button type="submit" className="m3-btn m3-btn-filled" style={{ marginTop: '8px', padding: '12px' }}>
                <span className="material-symbols-outlined">meeting_room</span>
                Connect to Secret Room Space
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--m3-surface-container-lowest)', borderTop: '1px solid var(--m3-outline-variant)', padding: '20px 32px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--m3-on-surface-variant)' }}>
        © 2026 Nexus Global Systems Inc. All Rights Reserved. Equal Opportunity Employer.
      </footer>
    </div>
  );
}
