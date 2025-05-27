import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

// --- Icon Placeholders ---
const UserCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" /></svg>;
const DocumentArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path fillRule="evenodd" d="M10.5 3.75a6 6 0 00-5.98 6.496A5.25 5.25 0 006.75 20.25H18a4.5 4.5 0 002.206-8.423 3.75 3.75 0 00-4.133-4.303A6.001 6.001 0 0010.5 3.75zm2.03 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v4.94a.75.75 0 001.5 0v-4.94l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" /></svg>;
const LightBulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 7.758a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 1.255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.332.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.759 6.759 0 010-1.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const XMarkIconMini = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>;

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
      // Initial message indicating upload received and parsing started
      const initialResponse = await profileAPI.uploadResume(file);
      setUploadSuccess(initialResponse.message || 'Resume uploaded. Processing started... Profile will refresh shortly.');
      setFile(null); // Clear the selected file
      const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = ''; // Reset file input

      // Wait for a few seconds to allow backend parsing to complete
      setTimeout(async () => {
        try {
          console.log('[ProfilePage] Refetching profile data after resume upload delay...');
          const profileData = await profileAPI.getProfile();
          setProfile(profileData);
          setAccountInfo(prev => ({ ...prev, first_name: profileData.first_name || '', last_name: profileData.last_name || '' }));
          if (profileData.skills) setActiveSkills(profileData.skills);
          // Update success message after fetching potentially parsed data
          setUploadSuccess(`Resume processed. Name: ${profileData.first_name || ''} ${profileData.last_name || ''}. Skills found: ${profileData.skills?.length || 0}.`);
        } catch (fetchErr: any) {
          console.error('[ProfilePage] Error fetching profile after resume upload delay:', fetchErr);
          setUploadError(fetchErr.response?.data?.detail || fetchErr.message || 'Failed to refresh profile data after resume processing.');
        } finally {
          setUploading(false); // Set uploading to false only after everything is done
        }
      }, 7000); // 7-second delay
    } catch (err: any) { 
      setUploadError(err.response?.data?.detail || err.message || 'Failed to upload resume.'); 
      setUploading(false); // Ensure uploading is set to false on initial upload error
    }
    // Note: setUploading(false) is now primarily handled within the setTimeout or initial catch block
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-theme-bg text-theme-text-primary p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent-cyan mb-4"></div>
        <p className="text-xl font-display">Loading Profile...</p>
      </div>
    );
  }
  if (error && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-theme-bg text-theme-text-primary p-4">
        <p className="text-xl text-amber-400 font-display">{error}</p>
        <Link to="/login" className="mt-4 px-4 py-2 border border-theme-accent-cyan text-sm font-medium rounded-md text-theme-accent-cyan hover:bg-theme-accent-cyan/10 transition-colors">
            Go to Login
        </Link>
      </div>
    );
  }
  if (!profile) {
     return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-theme-bg text-theme-text-primary p-4">
        <p className="text-xl font-display">Profile data not available.</p>
         <Link to="/login" className="mt-4 px-4 py-2 border border-theme-accent-cyan text-sm font-medium rounded-md text-theme-accent-cyan hover:bg-theme-accent-cyan/10 transition-colors">
            Go to Login
        </Link>
      </div>
    );
  }
  
  const inputClasses = "appearance-none block w-full px-3 py-2 bg-theme-bg border border-slate-700 rounded-md shadow-sm placeholder-slate-500 text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan sm:text-sm";
  const labelClasses = "block text-sm font-medium text-theme-text-secondary mb-1";
  const buttonPrimaryClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan disabled:opacity-60 transition-colors";
  
  const alertErrorClasses = "bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-md relative";
  const alertSuccessClasses = "bg-theme-accent-cyan/10 border border-theme-accent-cyan/30 text-theme-accent-cyan px-4 py-3 rounded-md relative";

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-theme-text-primary">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10">
        <h1 className="text-4xl font-display font-bold mb-4 md:mb-0">Your Profile</h1>
        <button onClick={handleFindJobs} className={`${buttonPrimaryClasses} w-full md:w-auto`}>
          Find Matching Jobs
        </button>
      </div>

      <div className="space-y-8">

        <section className="bg-theme-surface shadow-xl rounded-lg p-6 sm:p-8">
          <div className="flex items-center mb-4"><UserCircleIcon /><h2 className="text-2xl font-display font-semibold">Account Information</h2></div>
          <p className="text-sm text-theme-text-secondary mb-6">Your basic account information. Email is read-only.</p>
          <form onSubmit={handleAccountInfoSubmit} className="space-y-4">
            {accountInfoError && <div className={alertErrorClasses} role="alert">{accountInfoError}</div>}
            {accountInfoSuccess && <div className={alertSuccessClasses} role="alert">{accountInfoSuccess}</div>}
            <div>
              <label htmlFor="email" className={labelClasses}>Email address</label>
              <input type="email" name="email" id="email" value={accountInfo.email} readOnly className={`${inputClasses} bg-slate-800 cursor-not-allowed text-slate-400`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="first_name" className={labelClasses}>First Name</label><input type="text" name="first_name" id="first_name" placeholder="From resume or manual entry" value={accountInfo.first_name} onChange={handleAccountInfoChange} className={inputClasses} /></div>
              <div><label htmlFor="last_name" className={labelClasses}>Last Name</label><input type="text" name="last_name" id="last_name" placeholder="From resume or manual entry" value={accountInfo.last_name} onChange={handleAccountInfoChange} className={inputClasses} /></div>
            </div>
            <div><p className={`${labelClasses} mb-0`}>Current Resume</p><p className="text-sm text-theme-text-primary mt-1">{profile.resume_path ? profile.resume_path.split('/').pop() : 'No resume uploaded yet.'}</p></div>
            <div><button type="submit" disabled={savingAccountInfo} className={`${buttonPrimaryClasses} min-w-[180px]`}>{savingAccountInfo ? 'Saving...' : 'Update Account Info'}</button></div>
          </form>
        </section>

        <section className="bg-theme-surface shadow-xl rounded-lg p-6 sm:p-8">
          <div className="flex items-center mb-4"><DocumentArrowUpIcon /><h2 className="text-2xl font-display font-semibold">Upload Resume</h2></div>
          <p className="text-sm text-theme-text-secondary mb-6">Upload your latest resume (PDF or DOCX). Our AI will extract skills, experiences, and update your name.</p>
          <form className="space-y-4" onSubmit={handleUpload}>
             {uploadError && <div className={alertErrorClasses} role="alert">{uploadError}</div>}
             {uploadSuccess && <div className={alertSuccessClasses} role="alert">{uploadSuccess}</div>}
            <div>
              <label htmlFor="resume-upload" className={labelClasses}>Resume file</label>
              <input id="resume-upload" name="resume-upload" type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx" 
                     className={`block w-full text-sm text-theme-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-theme-accent-cyan file:text-theme-bg hover:file:bg-theme-accent-cyan-darker file:transition-colors file:cursor-pointer ${inputClasses} p-0`} 
                     disabled={uploading} />
               {file && <p className="text-xs text-theme-text-secondary mt-1">Selected: {file.name}</p>}
            </div>
            <div><button type="submit" disabled={!file || uploading} className={`${buttonPrimaryClasses} min-w-[220px]`}>{uploading ? 'Processing Resume...' : 'Upload & Parse Resume'}</button></div>
            {uploading && <div className="text-sm text-theme-text-secondary">Analyzing your resume... this may take a moment.</div>}
          </form>
        </section>

        <section className="bg-theme-surface shadow-xl rounded-lg p-6 sm:p-8">
          <div className="flex items-center mb-4"><LightBulbIcon /><h2 className="text-2xl font-display font-semibold">Skills</h2></div>
          <p className="text-sm text-theme-text-secondary mb-6">Add skills to refine job matches. Resume skills are added automatically.</p>
          {skillError && <div className={`${alertErrorClasses} mb-4`} role="alert">{skillError}</div>}
          {skillSuccess && <div className={`${alertSuccessClasses} mb-4`} role="alert">{skillSuccess}</div>}
          <form className="flex flex-col sm:flex-row items-end gap-3 mb-6" onSubmit={handleAddSkill}>
            <div className="flex-grow w-full sm:w-auto"><label htmlFor="newSkill" className={labelClasses}>New Skill</label><input type="text" id="newSkill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="e.g., JavaScript, React" className={inputClasses} /></div>
            <div className="w-full sm:w-48"><label htmlFor="skillLevel" className={labelClasses}>Proficiency</label><select id="skillLevel" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className={`${inputClasses} py-[9px]`}><option value="Beginner">Beginner</option> <option value="Intermediate">Intermediate</option> <option value="Advanced">Advanced</option> <option value="Expert">Expert</option></select></div>
            <button type="submit" disabled={addingSkill || !newSkill.trim()} className={`${buttonPrimaryClasses} w-full sm:w-auto whitespace-nowrap`}>{addingSkill ? 'Adding...' : 'Add Skill'}</button>
          </form>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-theme-text-primary">Your Skills</h3>
            {activeSkills.length > 0 && <button type="button" onClick={handleDeleteAllSkills} className="text-xs text-amber-400 hover:text-amber-300 hover:underline disabled:opacity-50">Delete All Skills</button>}
          </div>
          {activeSkills.length === 0 ? (
            <p className="text-sm text-theme-text-secondary italic">No skills added. Upload resume or add manually.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeSkills.map((skill) => (
                <div key={skill.id} className="inline-flex items-center py-1 pl-3 pr-1 bg-theme-accent-cyan/20 text-sm font-medium text-theme-accent-cyan rounded-full">
                  <span>{skill.name}</span>
                  {skill.level && <span className="ml-1.5 text-xs bg-theme-accent-cyan/30 text-theme-accent-cyan px-1.5 py-0.5 rounded-full">{skill.level}</span>}
                  <button type="button" onClick={() => handleRemoveSkill(skill.id)} className="flex-shrink-0 ml-1.5 h-5 w-5 rounded-full inline-flex items-center justify-center text-theme-accent-cyan hover:bg-theme-accent-cyan/30 focus:outline-none">
                    <span className="sr-only">Remove {skill.name}</span> <XMarkIconMini />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-theme-surface shadow-xl rounded-lg p-6 sm:p-8">
          <div className="flex items-center mb-4"><CogIcon /><h2 className="text-2xl font-display font-semibold">Job Preferences</h2></div>
          <p className="text-sm text-theme-text-secondary mb-6">Set your preferences for job roles to tailor your matches.</p>
          <form className="space-y-4" onSubmit={handlePreferencesSubmit}>
            {preferencesError && <div className={alertErrorClasses} role="alert">{preferencesError}</div>}
            {preferencesSuccess && <div className={alertSuccessClasses} role="alert">{preferencesSuccess}</div>}
            <div>
              <label htmlFor="desired_roles" className={labelClasses}>Desired Roles (comma separated)</label>
              <input type="text" name="desired_roles" id="desired_roles" value={preferences.desired_roles} onChange={handlePreferencesChange} placeholder="Software Engineer, Frontend Developer, etc." className={inputClasses} />
              <p className="mt-1 text-xs text-theme-text-secondary">List roles you're interested in, separated by commas.</p>
            </div>
            <div><button type="submit" disabled={savingPreferences} className={`${buttonPrimaryClasses} min-w-[180px]`}>{savingPreferences ? 'Saving...' : 'Save Preferences'}</button></div>
          </form>
        </section>

      </div>
    </div>
  );
};

export default ProfilePage;
