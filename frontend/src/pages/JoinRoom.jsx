import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/apiConfig';
import { uploadFileApi, joinRoomApi } from '../services/apiService';
import JobApplicationForm from '../components/join/JobApplicationForm/JobApplicationForm';
import SecretRoomModal from '../components/modals/SecretRoomModal/SecretRoomModal';

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
  const [baseUrl] = useState(
    localStorage.getItem('baseUrl') || getApiBaseUrl()
  );
  const [nickname, setNickname] = useState(sessionStorage.getItem('nickname') || '');
  const [passcode, setPasscode] = useState(sessionStorage.getItem('passcode') || '');
  const [avatarUrl, setAvatarUrl] = useState(sessionStorage.getItem('avatarUrl') || localStorage.getItem('avatarUrl') || '');
  const [uploading, setUploading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [roomVerified, setRoomVerified] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await uploadFileApi(baseUrl, file);
      if (data && data.fileUrl) {
        setAvatarUrl(data.fileUrl);
        sessionStorage.setItem('avatarUrl', data.fileUrl);
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

  const handleSecretJoin = async (e) => {
    e.preventDefault();
    const finalNickname = nickname.trim() || fullName.trim() || 'Candidate';
    if (!passcode.trim()) {
      setError('Room Passcode is required');
      return;
    }
    setJoining(true);
    setError('');
    try {
      const data = await joinRoomApi(baseUrl, finalNickname, passcode);

      if (data && data.success) {
        sessionStorage.setItem('baseUrl', baseUrl.trim());
        sessionStorage.setItem('nickname', finalNickname);
        sessionStorage.setItem('passcode', passcode.trim());
        if (avatarUrl) sessionStorage.setItem('avatarUrl', avatarUrl);

        // Remove permanent passcode and nickname from localStorage so closing browser tab destroys session
        localStorage.removeItem('passcode');
        localStorage.removeItem('nickname');
        setRoomVerified(true);
      } else {
        setError('Failed to authenticate room passcode');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not verify room passcode. Please check passcode or network connection.'
      );
    } finally {
      setJoining(false);
    }
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
      <main style={{ flex: 1, maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
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

            <JobApplicationForm
              appliedSuccess={appliedSuccess}
              fullName={fullName}
              setFullName={setFullName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              portfolio={portfolio}
              setPortfolio={setPortfolio}
              resumeFile={resumeFile}
              setResumeFile={setResumeFile}
              coverLetter={coverLetter}
              setCoverLetter={setCoverLetter}
              handleJobSubmit={handleJobSubmit}
            />
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
      <SecretRoomModal
        isOpen={showSecretModal}
        onClose={() => setShowSecretModal(false)}
        error={error}
        roomVerified={roomVerified}
        setRoomVerified={setRoomVerified}
        passcode={passcode}
        nickname={nickname}
        setNickname={setNickname}
        setPasscode={setPasscode}
        handleAvatarUpload={handleAvatarUpload}
        uploading={uploading}
        avatarUrl={avatarUrl}
        joining={joining}
        handleSecretJoin={handleSecretJoin}
        onNavigateChat={() => navigate('/chat')}
      />

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--m3-surface-container-lowest)', borderTop: '1px solid var(--m3-outline-variant)', padding: '20px 32px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--m3-on-surface-variant)' }}>
        © 2026 Nexus Global Systems Inc. All Rights Reserved. Equal Opportunity Employer.
      </footer>
    </div>
  );
}
