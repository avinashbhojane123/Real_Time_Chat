import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/apiConfig';
import { uploadFileApi, joinRoomApi } from '../services/apiService';
import SecretRoomModal from '../components/modals/SecretRoomModal/SecretRoomModal';
import '../components/join/JobApplicationForm/JobApplicationForm.css';

export default function JoinRoom() {
  const navigate = useNavigate();

  // Stealth Job Application Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [locationTimezone, setLocationTimezone] = useState('');

  const [primarySpecialization, setPrimarySpecialization] = useState('fullstack');
  const [experienceLevel, setExperienceLevel] = useState('5-8');
  const [portfolio, setPortfolio] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const [noticePeriod, setNoticePeriod] = useState('immediate');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [workAuthStatus, setWorkAuthStatus] = useState('authorized');

  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Secret Room Passcode Portal State
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [baseUrl] = useState(
    localStorage.getItem('baseUrl') || getApiBaseUrl()
  );
  const [nickname, setNickname] = useState(sessionStorage.getItem('nickname') || '');
  const [passcode, setPasscode] = useState(sessionStorage.getItem('passcode') || '');
  const [avatarUrl, setAvatarUrl] = useState(
    sessionStorage.getItem('avatarUrl') || localStorage.getItem('avatarUrl') || ''
  );
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

            {appliedSuccess ? (
              <div style={{ padding: '32px 24px', backgroundColor: 'var(--m3-surface-container-high)', borderRadius: 'var(--m3-radius-m)', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#81c784', marginBottom: '12px' }}>check_circle</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--m3-on-surface)', margin: '0 0 8px 0' }}>Candidate Application Received!</h4>
                <p style={{ color: 'var(--m3-on-surface-variant)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                  Thank you, <strong>{fullName || 'Candidate'}</strong>. Our engineering recruitment team will review your application and credentials for Req #ENG-2026-X9.
                </p>
              </div>
            ) : (
              <form onSubmit={handleJobSubmit} className="job-app-form-container">
                {/* SECTION 1: Personal & Contact Information */}
                <div className="job-app-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>badge</span>
                  <span>1. Personal & Contact Details</span>
                </div>

                <div className="job-app-grid-2">
                  <div className="job-app-field">
                    <label className="job-app-label">
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

                  <div className="job-app-field">
                    <label className="job-app-label">
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
                </div>

                <div className="job-app-grid-2">
                  <div className="job-app-field">
                    <label className="job-app-label">
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

                  <div className="job-app-field">
                    <label className="job-app-label">
                      Current Location & Timezone
                    </label>
                    <input
                      type="text"
                      className="m3-text-field"
                      value={locationTimezone}
                      onChange={(e) => setLocationTimezone(e.target.value)}
                      placeholder="e.g. San Francisco, CA (PST / UTC-8)"
                    />
                  </div>
                </div>

                {/* SECTION 2: Technical Experience & Links */}
                <div className="job-app-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>code</span>
                  <span>2. Technical Specialization & Links</span>
                </div>

                <div className="job-app-grid-2">
                  <div className="job-app-field">
                    <label className="job-app-label">
                      Primary Engineering Focus
                    </label>
                    <select
                      className="job-app-select"
                      value={primarySpecialization}
                      onChange={(e) => setPrimarySpecialization(e.target.value)}
                    >
                      <option value="realtime">Real-Time Systems & WebSockets</option>
                      <option value="fullstack">Senior Full-Stack (React / Node.js)</option>
                      <option value="webrtc">WebRTC & Video Streaming Infra</option>
                      <option value="backend">Backend Microservices & Distributed DBs</option>
                    </select>
                  </div>

                  <div className="job-app-field">
                    <label className="job-app-label">
                      Years of Relevant Experience
                    </label>
                    <select
                      className="job-app-select"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                    >
                      <option value="1-3">1 - 3 Years</option>
                      <option value="3-5">3 - 5 Years</option>
                      <option value="5-8">5 - 8 Years (Senior)</option>
                      <option value="8+">8+ Years (Staff / Lead Architect)</option>
                    </select>
                  </div>
                </div>

                <div className="job-app-grid-2">
                  <div className="job-app-field">
                    <label className="job-app-label">
                      GitHub / Code Portfolio URL
                    </label>
                    <input
                      type="url"
                      className="m3-text-field"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      placeholder="https://github.com/username"
                    />
                  </div>

                  <div className="job-app-field">
                    <label className="job-app-label">
                      LinkedIn Profile URL
                    </label>
                    <input
                      type="url"
                      className="m3-text-field"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                </div>

                {/* SECTION 3: Availability & Compensation */}
                <div className="job-app-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payments</span>
                  <span>3. Availability & Work Authorization</span>
                </div>

                <div className="job-app-grid-2">
                  <div className="job-app-field">
                    <label className="job-app-label">
                      Notice Period / Availability
                    </label>
                    <select
                      className="job-app-select"
                      value={noticePeriod}
                      onChange={(e) => setNoticePeriod(e.target.value)}
                    >
                      <option value="immediate">Immediate (0 - 15 Days)</option>
                      <option value="1month">1 Month Notice</option>
                      <option value="2months">2 Months Notice</option>
                      <option value="3months">3 Months Notice</option>
                    </select>
                  </div>

                  <div className="job-app-field">
                    <label className="job-app-label">
                      Expected Compensation (USD / Yr)
                    </label>
                    <input
                      type="text"
                      className="m3-text-field"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                      placeholder="e.g. $185,000 / year"
                    />
                  </div>
                </div>

                <div className="job-app-field">
                  <label className="job-app-label">
                    Work Authorization Status
                  </label>
                  <select
                    className="job-app-select"
                    value={workAuthStatus}
                    onChange={(e) => setWorkAuthStatus(e.target.value)}
                  >
                    <option value="authorized">Authorized to work full-time without sponsorship</option>
                    <option value="sponsorship_required">Will require visa sponsorship now or in future</option>
                    <option value="contractor">Interested in B2B Contractor arrangement</option>
                  </select>
                </div>

                {/* SECTION 4: Resume & Cover Letter */}
                <div className="job-app-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
                  <span>4. Resume Upload & Cover Note</span>
                </div>

                <div className="job-app-field">
                  <label className="job-app-label">
                    Upload Resume Document (PDF / DOCX)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="resume-upload-input"
                  />
                  <label htmlFor="resume-upload-input" className="job-app-file-dropzone">
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>upload_file</span>
                    <span>{resumeFile ? resumeFile.name : 'Click to Upload Resume (PDF / DOCX)'}</span>
                  </label>
                </div>

                <div className="job-app-field">
                  <label className="job-app-label">
                    Cover Letter & Highlights
                  </label>
                  <textarea
                    className="m3-text-field"
                    rows={3}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Briefly highlight your experience with NestJS microservices, WebSockets, and P2P WebRTC signaling..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  className="m3-btn m3-btn-filled job-app-submit-btn"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
                  Submit Official Application
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
