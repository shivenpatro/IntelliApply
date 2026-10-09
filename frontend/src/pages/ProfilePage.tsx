import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '../context/auth';
import { profileAPI } from '../services/api';
import { waitForTask } from '../lib/tasks';
import { errorMessage, retryAfter } from '../lib/errors';
import { useNavigate, Link } from 'react-router-dom';

/* ── Icon Components ── */
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const UploadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const BulbIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>;
const CogIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const XSmallIcon = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/></svg>;

interface UserProfile { id: string; email: string; first_name?: string; last_name?: string; resume_path?: string; desired_roles?: string; desired_locations?: string; min_salary?: number; skills?: Skill[]; experiences?: Experience[]; }
interface Skill { id: number; name: string; level?: string; }
interface Experience { id: number; title: string; company: string; location?: string; start_date?: string; end_date?: string; description?: string; }

const ProfilePage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const [preferences, setPreferences] = useState({ desired_roles: '', desired_locations: '' });
  const uploadOperation = useRef<AbortController | null>(null);
  useEffect(() => () => uploadOperation.current?.abort(), []);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const [accountInfo, setAccountInfo] = useState({ email: user?.email || '', first_name: '', last_name: '' });
  const [savingAccountInfo, setSavingAccountInfo] = useState(false);
  const [accountInfoSuccess, setAccountInfoSuccess] = useState<string | null>(null);
  const [accountInfoError, setAccountInfoError] = useState<string | null>(null);

  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);
  const [editingExperience, setEditingExperience] = useState<number | null>(null);
  const [experienceDraft, setExperienceDraft] = useState({ title: '', company: '', location: '', start_date: '', end_date: '', description: '' });
  const [experienceSaving, setExperienceSaving] = useState(false);
  const [experienceError, setExperienceError] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillSuccess, setSkillSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const fetchProfile = async () => {
        setLoading(true); setError(null);
        try {
          const profileData = await profileAPI.getProfile();
          setProfile(profileData);
          setPreferences({ desired_roles: profileData.desired_roles || '', desired_locations: profileData.desired_locations || '' });
          setAccountInfo({ email: user?.email || profileData.email || '', first_name: profileData.first_name || '', last_name: profileData.last_name || '' });
          if (profileData.skills) setActiveSkills(profileData.skills);
        } catch (err: unknown) { setError(errorMessage(err) || 'Failed to load profile.'); }
        finally { setLoading(false); }
      };
      const timer = setTimeout(() => void fetchProfile(), 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading, user?.email]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selected = event.target.files[0];
      if (!/\.(pdf|docx)$/i.test(selected.name) || selected.size > 5 * 1024 * 1024) {
        setFile(null); event.target.value = ''; setUploadError('Choose a PDF or DOCX smaller than 5 MiB.'); return;
      }
      setFile(selected); setUploadError(null); setUploadSuccess(null);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || uploadOperation.current || Date.now() < cooldownUntil) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError('Choose a PDF or DOCX smaller than 5 MiB.'); return; }
    const controller = new AbortController(); uploadOperation.current = controller;
    setUploading(true); setUploadError(null); setUploadSuccess(null); setUploadProgress('Submitting your resume…');
    try {
      const accepted = await profileAPI.uploadResume(file);
      if (controller.signal.aborted) return;
      if (!accepted.task_id) throw new Error('The backend must be updated before resume processing can be verified.');
      const result = await waitForTask(signal => profileAPI.getResumeStatus(accepted.task_id, signal), controller.signal, setUploadProgress);
      if (result.status !== 'completed') throw new Error(result.message);
      const updated = await profileAPI.getProfile();
      if (controller.signal.aborted) return;
      setProfile(updated); setActiveSkills(updated.skills || []);
      setAccountInfo(prev => ({ ...prev, first_name: updated.first_name || '', last_name: updated.last_name || '' }));
      setUploadSuccess(result.message); setFile(null);
      const input = document.getElementById('resume-upload') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err) {
      if (!controller.signal.aborted) {
        setUploadSuccess(null); setUploadError(errorMessage(err));
        const seconds = retryAfter(err);
        if (seconds) { setClock(Date.now()); setCooldownUntil(Date.now() + seconds * 1000); }
      }
    } finally {
      uploadOperation.current = null;
      if (!controller.signal.aborted) { setUploading(false); setUploadProgress(''); }
    }
  };

  const handleAccountInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => setAccountInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAccountInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccountInfo(true);
    setAccountInfoError(null);
    setAccountInfoSuccess(null);
    try {
      const accountData = {
        first_name: accountInfo.first_name,
        last_name: accountInfo.last_name
      };
      const updatedProfileData = await profileAPI.updatePreferences(accountData);
      setProfile(prev => prev ? {...prev, ...updatedProfileData} : updatedProfileData);
      setAccountInfoSuccess('Account information updated successfully!');
    } catch (err: unknown) {
      setAccountInfoError(errorMessage(err) || 'Failed to update account information.');
    } finally {
      setSavingAccountInfo(false);
    }
  };

  const handlePreferencesChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPreferences(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPreferences(true);
    setPreferencesError(null);
    setPreferencesSuccess(null);
    try {
      const preferencesData = preferences;
      const updatedProfileData = await profileAPI.updatePreferences(preferencesData);
      setProfile(prev => prev ? {...prev, ...updatedProfileData} : updatedProfileData);
      setPreferencesSuccess('Preferences updated successfully!');
    } catch (err: unknown) {
      setPreferencesError(errorMessage(err) || 'Failed to update preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) {
      setSkillError("Skill name cannot be empty.");
      return;
    }
    setAddingSkill(true);
    setSkillError(null);
    setSkillSuccess(null);
    try {
      const newSkillData = [{ name: newSkill.trim(), level: skillLevel }];
      const addedSkillsResponse = await profileAPI.addSkills(newSkillData);
      if (Array.isArray(addedSkillsResponse)) {
        setActiveSkills(prev => Array.from(new Map([...prev, ...addedSkillsResponse].map(skill => [skill.id, skill])).values()));
      } else if (addedSkillsResponse && typeof addedSkillsResponse === 'object') {
        setActiveSkills(prev => [...prev, addedSkillsResponse as Skill]);
      } else {
        const profileData = await profileAPI.getProfile();
        if (profileData.skills) setActiveSkills(profileData.skills);
      }
      setSkillSuccess(`"${newSkill.trim()}" added successfully!`);
      setNewSkill('');
    } catch (err: unknown) {
      setSkillError(errorMessage(err) || 'Failed to add skill.');
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillId: number) => {
    setSkillError(null);
    setSkillSuccess(null);
    try {
      await profileAPI.deleteSkill(skillId);
      setActiveSkills(prev => prev.filter(skill => skill.id !== skillId));
      setSkillSuccess('Skill removed.');
    } catch (err: unknown) {
      setSkillError(errorMessage(err) || 'Failed to remove skill.');
    }
  };

  const handleDeleteAllSkills = async () => {
    if (window.confirm('Are you sure you want to delete all your skills? This action cannot be undone.')) {
      setSkillError(null);
      setSkillSuccess(null);
      try {
        const success = await profileAPI.deleteAllSkills();
        if (success) {
          setActiveSkills([]);
          setSkillSuccess('All skills have been deleted.');
        } else {
          setSkillError('Failed to delete all skills. The operation may not have completed as expected.');
        }
      } catch (err: unknown) {
        setSkillError(errorMessage(err) || 'Failed to delete all skills.');
      }
    }
  };

  const saveExperience = async (event: React.FormEvent) => {
    event.preventDefault(); setExperienceSaving(true); setExperienceError(null);
    try {
      const values = { ...experienceDraft, start_date: experienceDraft.start_date || undefined, end_date: experienceDraft.end_date || undefined };
      if (editingExperience) await profileAPI.updateExperience(editingExperience, values);
      else await profileAPI.addExperiences([values]);
      setProfile(await profileAPI.getProfile()); setEditingExperience(null);
      setExperienceDraft({ title: '', company: '', location: '', start_date: '', end_date: '', description: '' });
    } catch (err) { setExperienceError(errorMessage(err)); }
    finally { setExperienceSaving(false); }
  };
  const deleteExperience = async (id: number) => {
    try { await profileAPI.deleteExperience(id); setProfile(await profileAPI.getProfile()); }
    catch (err) { setExperienceError(errorMessage(err)); }
  };

  const handleFindJobs = () => navigate('/dashboard?refresh=true');

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <div className="spinner" />
        <p style={{ marginTop: '16px', fontSize: '18px', fontFamily: "'Playfair Display', serif", fontWeight: 500, color: 'var(--text-primary)' }}>Loading profile</p>
      </div>
    );
  }
  if (error && !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <p style={{ fontSize: '18px', color: 'var(--status-interested-text)', fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>{error}</p>
        <Link to="/login" className="btn btn-secondary" style={{ marginTop: '16px' }}>Go to Login</Link>
      </div>
    );
  }
  if (!profile) {
     return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <p style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", fontWeight: 500, color: 'var(--text-primary)' }}>Profile data not available.</p>
        <Link to="/login" className="btn btn-secondary" style={{ marginTop: '16px' }}>Go to Login</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-7) var(--space-5)', paddingTop: 'calc(60px + var(--space-7))' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-7)', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="text-h1">Your <span className="text-accent">Profile</span></h1>
          <p className="text-body" style={{ marginTop: '4px' }}>Manage your account, resume, and job preferences.</p>
        </div>
        <button onClick={handleFindJobs} className="btn btn-primary">Find Matching Jobs</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

        {/* Account Information */}
        <section className="card card-feature card-hover" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div className="card-icon" style={{ marginBottom: 0 }}><UserIcon /></div>
            <h2 className="text-h2" style={{ margin: 0 }}>Account Information</h2>
          </div>
          <p className="text-body" style={{ marginBottom: 'var(--space-5)' }}>Your basic account information. Email is read-only.</p>
          <form onSubmit={handleAccountInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {accountInfoError && <div className="alert alert-error" role="alert">{accountInfoError}</div>}
            {accountInfoSuccess && <div className="alert alert-success" role="alert">{accountInfoSuccess}</div>}
            <div>
              <label htmlFor="email" className="input-label">Email address</label>
              <input type="email" name="email" id="email" value={accountInfo.email} readOnly className="input-field" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label htmlFor="first_name" className="input-label">First Name</label>
                <input type="text" name="first_name" id="first_name" placeholder="From resume or manual entry" value={accountInfo.first_name} onChange={handleAccountInfoChange} className="input-field" />
              </div>
              <div>
                <label htmlFor="last_name" className="input-label">Last Name</label>
                <input type="text" name="last_name" id="last_name" placeholder="From resume or manual entry" value={accountInfo.last_name} onChange={handleAccountInfoChange} className="input-field" />
              </div>
            </div>
            <div>
              <span className="input-label">Current Resume</span>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '4px' }}>{profile.resume_path ? profile.resume_path.split('/').pop() : 'No resume uploaded yet.'}</p>
            </div>
            <div>
              <button type="submit" disabled={savingAccountInfo} className="btn btn-primary">
                {savingAccountInfo ? 'Saving...' : 'Update Account Info'}
              </button>
            </div>
          </form>
        </section>

        {/* Upload Resume */}
        <section className="card card-feature card-hover" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div className="card-icon" style={{ marginBottom: 0 }}><UploadIcon /></div>
            <h2 className="text-h2" style={{ margin: 0 }}>Upload Resume</h2>
          </div>
          <p className="text-body" style={{ marginBottom: 'var(--space-5)' }}>Upload your latest resume (PDF or DOCX). Our AI will extract skills, experiences, and update your name.</p>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {uploadError && <div className="alert alert-error" role="alert">{uploadError}</div>}
            {uploadSuccess && <div className="alert alert-success" role="alert">{uploadSuccess}</div>}
            <div>
              <label htmlFor="resume-upload" className="input-label">Resume file</label>
              <input
                id="resume-upload" name="resume-upload" type="file"
                onChange={handleFileChange} accept=".pdf,.docx"
                className="input-field"
                style={{ padding: '8px' }}
                disabled={uploading}
              />
              {file && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Selected: {file.name}</p>}
            </div>
            <div>
              <button type="submit" disabled={!file || uploading || clock < cooldownUntil} className="btn btn-primary">
                {uploading ? 'Processing Resume...' : 'Upload & Parse Resume'}
              </button>
            </div>
            {uploading && <p role="status" className="text-body">{uploadProgress}</p>}
            {clock < cooldownUntil && <p role="status">Retry available in {Math.ceil((cooldownUntil-clock)/1000)} seconds.</p>}
          </form>
        </section>

        {/* Skills */}
        <section className="card card-feature card-hover" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div className="card-icon" style={{ marginBottom: 0 }}><BulbIcon /></div>
            <h2 className="text-h2" style={{ margin: 0 }}>Skills</h2>
          </div>
          <p className="text-body" style={{ marginBottom: 'var(--space-5)' }}>Add skills to refine job matches. Resume skills are added automatically.</p>
          {skillError && <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>{skillError}</div>}
          {skillSuccess && <div className="alert alert-success" role="alert" style={{ marginBottom: 'var(--space-4)' }}>{skillSuccess}</div>}
          <form onSubmit={handleAddSkill} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label htmlFor="newSkill" className="input-label">New Skill</label>
              <input type="text" id="newSkill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="e.g., JavaScript, React" className="input-field" />
            </div>
            <div style={{ width: '160px' }}>
              <label htmlFor="skillLevel" className="input-label">Proficiency</label>
              <select id="skillLevel" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="input-field">
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <button type="submit" disabled={addingSkill || !newSkill.trim()} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              {addingSkill ? 'Adding...' : 'Add Skill'}
            </button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Your Skills</h3>
            {activeSkills.length > 0 && (
              <button type="button" onClick={handleDeleteAllSkills} className="btn-danger btn btn-sm" style={{ padding: '4px 10px' }}>
                Delete All Skills
              </button>
            )}
          </div>
          {activeSkills.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No skills added. Upload resume or add manually.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {activeSkills.map((skill) => (
                <div key={skill.id} className="badge" style={{ paddingRight: '4px', gap: '4px' }}>
                  <span>{skill.name}</span>
                  {skill.level && <span style={{ fontSize: '10px', opacity: 0.7 }}>({skill.level})</span>}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '18px', height: '18px', borderRadius: '50%', border: 'none',
                      background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
                      padding: 0, marginLeft: '2px',
                    }}
                  >
                    <span className="sr-only">Remove {skill.name}</span>
                    <XSmallIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card" style={{padding:'var(--space-6)'}}>
          <h2 className="text-h2">Experience</h2>
          {experienceError && <p role="alert" className="alert alert-error">{experienceError}</p>}
          {(profile.experiences || []).map(experience => <div key={experience.id} style={{marginBottom:16}}>
            <p><strong>{experience.title}</strong> · {experience.company}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              setEditingExperience(experience.id);
              setExperienceDraft({title:experience.title,company:experience.company,location:experience.location || '',start_date:(experience.start_date || '').slice(0,10),end_date:(experience.end_date || '').slice(0,10),description:experience.description || ''});
            }}>Edit experience</button>
            <button className="btn btn-sm" onClick={() => void deleteExperience(experience.id)}>Remove experience</button>
          </div>)}
          <form onSubmit={saveExperience} style={{display:'grid',gap:12}}>
            {(['title','company','location','start_date','end_date','description'] as const).map(field => <label key={field} className="input-label">
              {({title:'Job title',company:'Company',location:'Work location',start_date:'Start date',end_date:'End date',description:'Responsibilities'})[field]}
              <input className="input-field" type={field.endsWith('date') ? 'date' : 'text'} required={field==='title' || field==='company'} value={experienceDraft[field]} onChange={event => setExperienceDraft(previous => ({...previous,[field]:event.target.value}))}/>
            </label>)}
            <button className="btn btn-primary" disabled={experienceSaving}>{experienceSaving ? 'Saving…' : editingExperience ? 'Save Experience' : 'Add Experience'}</button>
          </form>
        </section>
        {/* Job Preferences */}
        <section className="card card-feature card-hover" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div className="card-icon" style={{ marginBottom: 0 }}><CogIcon /></div>
            <h2 className="text-h2" style={{ margin: 0 }}>Job Preferences</h2>
          </div>
          <p className="text-body" style={{ marginBottom: 'var(--space-5)' }}>Set your preferences for job roles to tailor your matches.</p>
          <form onSubmit={handlePreferencesSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {preferencesError && <div className="alert alert-error" role="alert">{preferencesError}</div>}
            {preferencesSuccess && <div className="alert alert-success" role="alert">{preferencesSuccess}</div>}
            <div>
              <label htmlFor="desired_roles" className="input-label">Desired Roles (comma separated)</label>
              <input type="text" name="desired_roles" id="desired_roles" value={preferences.desired_roles} onChange={handlePreferencesChange} placeholder="Software Engineer, Frontend Developer, etc." className="input-field" />
              <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>List roles you're interested in, separated by commas.</p>
            </div>
            <div>
              <label htmlFor="desired_locations" className="input-label">Preferred locations</label>
              <input id="desired_locations" name="desired_locations" className="input-field" value={preferences.desired_locations} onChange={handlePreferencesChange} placeholder="Remote, Bengaluru, etc." />
              <p className="text-body" style={{fontSize:12}}>Location helps rank matches; it is not a strict geographic filter. Salary filtering is unavailable because these feeds do not provide consistent salary data.</p>
            </div>
            <div>
              <button type="submit" disabled={savingPreferences} className="btn btn-primary">
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </section>

      </div>
    </div>
  );
};

export default ProfilePage;
