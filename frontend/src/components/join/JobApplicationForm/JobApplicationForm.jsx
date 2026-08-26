import React from 'react';
import './JobApplicationForm.css';

export default function JobApplicationForm({
  appliedSuccess,
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  portfolio,
  setPortfolio,
  resumeFile,
  setResumeFile,
  coverLetter,
  setCoverLetter,
  handleJobSubmit,
}) {
  if (appliedSuccess) {
    return (
      <div style={{ padding: '24px', backgroundColor: 'var(--m3-surface-container-high)', borderRadius: 'var(--m3-radius-m)', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#81c784', marginBottom: '12px' }}>check_circle</span>
        <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Application Received!</h4>
        <p style={{ color: 'var(--m3-on-surface-variant)', fontSize: '0.9rem', marginTop: '8px' }}>
          Thank you, <strong>{fullName}</strong>. Our engineering recruitment team will review your credentials and contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleJobSubmit} className="job-app-form-container">
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
  );
}
