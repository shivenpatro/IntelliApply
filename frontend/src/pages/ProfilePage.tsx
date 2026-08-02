import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

/* ── Icon Components ── */
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const UploadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const BulbIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>;
const CogIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const XSmallIcon = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/></svg>;

interface UserProfile { id: number; email: string; first_name?: string; last_name?: string; resume_path?: string; desired_roles?: string; desired_locations?: string; min_salary?: number; skills?: Skill[]; experiences?: Experience[]; }
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

  const [preferences, setPreferences] = useState({ desired_roles: '' });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const [accountInfo, setAccountInfo] = useState({ email: user?.email || '', first_name: '', last_name: '' });
  const [savingAccountInfo, setSavingAccountInfo] = useState(false);
  const [accountInfoSuccess, setAccountInfoSuccess] = useState<string | null>(null);
  const [accountInfoError, setAccountInfoError] = useState<string | null>(null);

  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);
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
          setPreferences({ desired_roles: profileData.desired_roles || '' });
          setAccountInfo({ email: user?.email || profileData.email || '', first_name: profileData.first_name || '', last_name: profileData.last_name || '' });
          if (profileData.skills) setActiveSkills(profileData.skills);
        } catch (err: any) { setError(err.message || 'Failed to load profile.'); } 
        finally { setLoading(false); }
      };
      fetchProfile();
    } else if (!authLoading && !isAuthenticated) {
      setError("Please log in to view your profile."); setLoading(false);
    }
  }, [isAuthenticated, authLoading, user?.email]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]); setUploadError(null); setUploadSuccess(null);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) { setUploadError('Please select a file to upload.'); return; }
    setUploading(true); setUploadError(null); setUploadSuccess(null);
    try {
      const initialResponse = await profileAPI.uploadResume(file);
      setUploadSuccess(initialResponse.message || 'Resume uploaded. Processing started... Profile will refresh shortly.');
      setFile(null);
      const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setTimeout(async () => {
        try {
          console.log('[ProfilePage] Refetching profile data after resume upload delay...');
          const profileData = await profileAPI.getProfile();
          setProfile(profileData);
          if (profileData.first_name || profileData.last_name) {
            console.log('[ProfilePage] Saving extracted name to backend...');
            await profileAPI.updatePreferences({
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || ''
            });
            setAccountInfo(prev => ({ ...prev, first_name: profileData.first_name || '', last_name: profileData.last_name || '' }));
            setAccountInfoSuccess('Name updated from resume!');
          }

          if (profileData.skills) setActiveSkills(profileData.skills);
          setUploadSuccess(`Resume processed. Name: ${profileData.first_name || ''} ${profileData.last_name || ''}. Skills found: ${profileData.skills?.length || 0}.`);
        } catch (fetchErr: any) {
          console.error('[ProfilePage] Error fetching profile after resume upload delay:', fetchErr);
          setUploadError(fetchErr.response?.data?.detail || fetchErr.message || 'Failed to refresh profile data after resume processing.');
        } finally {
          setUploading(false);
        }
      }, 7000);
    } catch (err: any) { 
      setUploadError(err.response?.data?.detail || err.message || 'Failed to upload resume.'); 
      setUploading(false);
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
    } catch (err: any) {
      console.error('Error updating account info:', err);
      setAccountInfoError(err.response?.data?.detail || err.message || 'Failed to update account information.');
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
      const preferencesData = { desired_roles: preferences.desired_roles };
      const updatedProfileData = await profileAPI.updatePreferences(preferencesData);
      setProfile(prev => prev ? {...prev, ...updatedProfileData} : updatedProfileData);
      setPreferencesSuccess('Preferences updated successfully!');
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setPreferencesError(err.response?.data?.detail || err.message || 'Failed to update preferences.');
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
        setActiveSkills(prev => [...prev, ...addedSkillsResponse]);
      } else if (addedSkillsResponse && typeof addedSkillsResponse === 'object') {
        setActiveSkills(prev => [...prev, addedSkillsResponse as Skill]);
      } else {
        const profileData = await profileAPI.getProfile();
        if (profileData.skills) setActiveSkills(profileData.skills);
      }
      setSkillSuccess(`"${newSkill.trim()}" added successfully!`);
      setNewSkill(''); 
    } catch (err: any) {
      console.error('[ProfilePage] Error adding skill:', err);
      setSkillError(err.response?.data?.detail || err.message || 'Failed to add skill.');
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
    } catch (err: any) {
      console.error('[ProfilePage] Error removing skill:', err);
      setSkillError(err.response?.data?.detail || err.message || 'Failed to remove skill.');
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
      } catch (err: any) {
        console.error('[ProfilePage] Error deleting all skills:', err);
        setSkillError(err.response?.data?.detail || err.message || 'Failed to delete all skills.');
      }
    }
  };

  const handleFindJobs = () => navigate('/dashboard?refresh=true');

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <div className="spinner" />
        <p style={{ marginTop: '16px', fontSize: '18px', fontFamily: "'Sora', sans-serif", fontWeight: 500, color: 'var(--text-primary)' }}>Loading Profile...</p>
      </div>
    );
  }
  if (error && !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <p style={{ fontSize: '18px', color: 'var(--status-interested-text)', fontFamily: "'Sora', sans-serif", fontWeight: 500 }}>{error}</p>
        <Link to="/login" className="btn btn-secondary" style={{ marginTop: '16px' }}>Go to Login</Link>
      </div>
    );
  }
  if (!profile) {
     return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <p style={{ fontSize: '18px', fontFamily: "'Sora', sans-serif", fontWeight: 500, color: 'var(--text-primary)' }}>Profile data not available.</p>
        <Link to="/login" className="btn btn-secondary" style={{ marginTop: '16px' }}>Go to Login</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-7) var(--space-5)', paddingTop: 'calc(60px + var(--space-7))' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-7)', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="text-h1">Your <span className="text-accent-gradient">Profile</span></h1>
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
                onChange={handleFileChange} accept=".pdf,.doc,.docx"
                className="input-field"
                style={{ padding: '8px' }}
                disabled={uploading}
              />
              {file && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Selected: {file.name}</p>}
            </div>
            <div>
              <button type="submit" disabled={!file || uploading} className="btn btn-primary">
                {uploading ? 'Processing Resume...' : 'Upload & Parse Resume'}
              </button>
            </div>
            {uploading && <p className="text-body" style={{ fontSize: '13px' }}>Analyzing your resume... this may take a moment.</p>}
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
