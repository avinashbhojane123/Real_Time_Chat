import { useState } from 'react';
import './JobApplicationForm.css';

export default function JobApplicationForm({
  appliedSuccess: propsAppliedSuccess,
  fullName: propsFullName,
  setFullName: propsSetFullName,
  email: propsEmail,
  setEmail: propsSetEmail,
  phone: propsPhone,
  setPhone: propsSetPhone,
  portfolio: propsPortfolio,
  setPortfolio: propsSetPortfolio,
  resumeFile: propsResumeFile,
  setResumeFile: propsSetResumeFile,
  coverLetter: propsCoverLetter,
  setCoverLetter: propsSetCoverLetter,
  handleJobSubmit: propsHandleJobSubmit,
}) {
  // Internal State Fallbacks for rich additional fields
  const [internalFullName, setInternalFullName] = useState('');
  const [internalEmail, setInternalEmail] = useState('');
  const [internalPhone, setInternalPhone] = useState('');
  const [internalPortfolio, setInternalPortfolio] = useState('');
  const [internalCoverLetter, setInternalCoverLetter] = useState('');
  const [internalResumeFile, setInternalResumeFile] = useState(null);
  const [internalAppliedSuccess, setInternalAppliedSuccess] = useState(false);

  // New Data Fields
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [locationTimezone, setLocationTimezone] = useState('');
  const [primarySpecialization, setPrimarySpecialization] = useState('fullstack');
  const [experienceLevel, setExperienceLevel] = useState('5-8');
  const [noticePeriod, setNoticePeriod] = useState('immediate');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [workAuthStatus, setWorkAuthStatus] = useState('authorized');

  // Value Getters & Setters
  const fullName = propsFullName !== undefined ? propsFullName : internalFullName;
  const setFullName = propsSetFullName || setInternalFullName;

  const email = propsEmail !== undefined ? propsEmail : internalEmail;
  const setEmail = propsSetEmail || setInternalEmail;

  const phone = propsPhone !== undefined ? propsPhone : internalPhone;
  const setPhone = propsSetPhone || setInternalPhone;

  const portfolio = propsPortfolio !== undefined ? propsPortfolio : internalPortfolio;
  const setPortfolio = propsSetPortfolio || setInternalPortfolio;

  const coverLetter = propsCoverLetter !== undefined ? propsCoverLetter : internalCoverLetter;
  const setCoverLetter = propsSetCoverLetter || setInternalCoverLetter;

  const resumeFile = propsResumeFile !== undefined ? propsResumeFile : internalResumeFile;
  const setResumeFile = propsSetResumeFile || setInternalResumeFile;

  const appliedSuccess = propsAppliedSuccess !== undefined ? propsAppliedSuccess : internalAppliedSuccess;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (propsHandleJobSubmit) {
      propsHandleJobSubmit(e);
    } else {
      setInternalAppliedSuccess(true);
    }
  };

  if (appliedSuccess) {
    return (
      <div style={{ padding: '32px 24px', backgroundColor: 'var(--m3-surface-container-high)', borderRadius: 'var(--m3-radius-m)', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#81c784', marginBottom: '12px' }}>check_circle</span>
        <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--m3-on-surface)', margin: '0 0 8px 0' }}>Candidate Application Received!</h4>
        <p style={{ color: 'var(--m3-on-surface-variant)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
          Thank you, <strong>{fullName || 'Candidate'}</strong>. Our engineering recruitment team will review your application and credentials for Req #ENG-2026-X9.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="job-app-form-container">
      
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
        className="m3-btn m3-btn-filled"
        style={{
          padding: '14px 24px',
          fontSize: '1rem',
          fontWeight: 700,
          width: '100%',
          justifyContent: 'center',
          marginTop: '8px',
          boxShadow: 'var(--m3-elevation-2)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
        Submit Official Application
      </button>
    </form>
  );
}
