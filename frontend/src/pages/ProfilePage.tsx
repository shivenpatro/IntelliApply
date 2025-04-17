import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';

// Define a type for the user profile
interface UserProfile {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  resume_path?: string;
  desired_roles?: string;
  desired_locations?: string;
  min_salary?: number;
  skills?: Skill[];
  experiences?: Experience[];
}

interface Skill {
  id: number;
  name: string;
  level?: string;
}

interface Experience {
  id: number;
  title: string;
  company: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

const ProfilePage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  
  // State for preferences form
  const [preferences, setPreferences] = useState({
    desired_roles: '',
    desired_locations: '',
    min_salary: ''
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  // State for account info form
  const [accountInfo, setAccountInfo] = useState({
    first_name: '',
    last_name: ''
  });
  const [savingAccountInfo, setSavingAccountInfo] = useState(false);
  const [accountInfoSuccess, setAccountInfoSuccess] = useState<string | null>(null);
  const [accountInfoError, setAccountInfoError] = useState<string | null>(null);

  // State for skills management
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillSuccess, setSkillSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch profile data from the API using our API service
          const profileData = await profileAPI.getProfile();
          setProfile(profileData);
          
          // Update preferences form with fetched data
          setPreferences({
            desired_roles: profileData.desired_roles || '',
            desired_locations: profileData.desired_locations || '',
            min_salary: profileData.min_salary ? String(profileData.min_salary) : ''
          });
          
          // Update account info form with fetched data
          setAccountInfo({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || ''
          });
          
          // Set initial active skills from profile
          if (profileData.skills && profileData.skills.length > 0) {
            setActiveSkills(profileData.skills);
          }
        } catch (err: any) {
          console.error('Error fetching profile:', err);
          setError(err.message || 'Failed to load profile.');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else if (!authLoading && !isAuthenticated) {
        // Handle case where user is not authenticated but tries to access profile
        setError("Please log in to view your profile.");
        setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setUploadError(null); // Clear previous errors on new file selection
      setUploadSuccess(null);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Upload resume using API service
      const response = await profileAPI.uploadResume(file);
      setUploadSuccess(response.message || 'Resume uploaded successfully!');
      
      // Refresh profile data to show new resume and extracted skills/experiences
      const profileData = await profileAPI.getProfile();
      setProfile(profileData);
      
      // Update active skills if new ones were extracted
      if (profileData.skills && profileData.skills.length > 0) {
        setActiveSkills(profileData.skills);
      }
      
      setFile(null); // Clear file input
    } catch (err: any) {
      console.error('Error uploading resume:', err);
      setUploadError(err.response?.data?.detail || err.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleAccountInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
      
      // Update profile via API service
      const updatedProfile = await profileAPI.updatePreferences(accountData);
      
      // Update profile with new data
      setProfile(prev => prev ? {...prev, ...updatedProfile} : null);
      setAccountInfoSuccess('Name updated successfully!');
    } catch (err: any) {
      console.error('Error updating account info:', err);
      setAccountInfoError(err.response?.data?.detail || err.message || 'Failed to update account information.');
    } finally {
      setSavingAccountInfo(false);
    }
  };

  const handlePreferencesChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPreferences(true);
    setPreferencesError(null);
    setPreferencesSuccess(null);
    
    try {
      const preferencesData = {
        desired_roles: preferences.desired_roles,
        desired_locations: preferences.desired_locations,
        min_salary: preferences.min_salary ? parseInt(preferences.min_salary) : undefined
      };
      
      // Update preferences via API service
      const updatedProfile = await profileAPI.updatePreferences(preferencesData);
      
      // Update profile with new data
      setProfile(prev => prev ? {...prev, ...updatedProfile} : null);
      setPreferencesSuccess('Preferences updated successfully!');
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setPreferencesError(err.response?.data?.detail || err.message || 'Failed to update preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Handle adding a new skill
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    
    setAddingSkill(true);
    setSkillError(null);
    setSkillSuccess(null);
    
    try {
      // Add the skill via API
      const newSkillData = [{ name: newSkill.trim(), level: skillLevel }];
      const addedSkills = await profileAPI.addSkills(newSkillData);
      
      // Update skills list
      setActiveSkills(prev => [...prev, ...addedSkills]);
      setSkillSuccess(`"${newSkill}" added successfully!`);
      setNewSkill(''); // Clear input
    } catch (err: any) {
      console.error('Error adding skill:', err);
      setSkillError(err.response?.data?.detail || err.message || 'Failed to add skill.');
    } finally {
      setAddingSkill(false);
    }
  };
  
  // Handle removing a skill
  const handleRemoveSkill = async (skillId: number) => {
    try {
      await profileAPI.deleteSkill(skillId);
      setActiveSkills(prev => prev.filter(skill => skill.id !== skillId));
    } catch (err: any) {
      console.error('Error removing skill:', err);
      setSkillError('Failed to remove skill. Please try again.');
    }
  };
  
  if (authLoading || loading) {
    return <div className="text-center py-10">Loading profile...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }

  if (!profile) {
     return <div className="text-center py-10">Profile data not available.</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Profile</h1>

      {/* Profile Information Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Account Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Your basic account information.</p>
        </div>
        
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <form onSubmit={handleAccountInfoSubmit}>
            {accountInfoError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-6 mt-4 rounded relative" role="alert">
                <span className="block sm:inline">{accountInfoError}</span>
              </div>
            )}
            {accountInfoSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 mx-6 mt-4 rounded relative" role="alert">
                <span className="block sm:inline">{accountInfoSuccess}</span>
              </div>
            )}
            <dl className="sm:divide-y sm:divide-gray-200">
              {/* Email - Read Only */}
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {/* Display email from authentication context */}
                  <input 
                    type="email" 
                    value={profile?.email || ''}
                    readOnly
                    disabled
                    className="shadow-sm block w-full sm:text-sm border-gray-300 bg-gray-100 rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email address cannot be changed</p>
                </dd>
              </div>
              
              {/* First Name */}
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">First Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <input 
                    type="text" 
                    name="first_name"
                    id="first_name"
                    placeholder="Enter your first name"
                    value={accountInfo.first_name}
                    onChange={handleAccountInfoChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </dd>
              </div>
              
              {/* Last Name */}
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <input 
                    type="text"
                    name="last_name"
                    id="last_name"
                    placeholder="Enter your last name"
                    value={accountInfo.last_name}
                    onChange={handleAccountInfoChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </dd>
              </div>
              
              {/* Resume Path - Read Only */}
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Current Resume</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.resume_path ? profile.resume_path.split('/').pop() : 'No resume uploaded yet.'}
                </dd>
              </div>
              
              {/* Save Button */}
              <div className="py-4 sm:py-5 sm:px-6">
                <button
                  type="submit"
                  disabled={savingAccountInfo}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {savingAccountInfo ? 'Saving...' : 'Update Name'}
                </button>
              </div>
            </dl>
          </form>
        </div>
      </div>

      {/* Resume Upload Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Upload Resume</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Upload your latest resume (PDF or DOCX). This will be used to match you with relevant jobs.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleUpload}>
             {uploadError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{uploadSuccess}</span>
                </div>
              )}
            <div>
              <label htmlFor="resume-upload" className="block text-sm font-medium text-gray-700">
                Resume file
              </label>
              <div className="mt-1 flex items-center">
                 <input 
                    id="resume-upload"
                    name="resume-upload"
                    type="file" 
                    onChange={handleFileChange} 
                    accept=".pdf,.doc,.docx"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                 />
              </div>
               {file && <p className="text-sm text-gray-500 mt-1">Selected: {file.name}</p>}
            </div>

            <div>
              <button
                type="submit"
                disabled={!file || uploading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Resume'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Job Preferences Section */}
      {/* Skills Section */}
      <div className="bg-white shadow sm:rounded-lg mt-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Skills</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Add your professional skills to help us find better job matches. Your resume skills will be automatically added when uploaded.
          </p>
          
          {skillError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
              <span className="block sm:inline">{skillError}</span>
            </div>
          )}
          {skillSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4" role="alert">
              <span className="block sm:inline">{skillSuccess}</span>
            </div>
          )}
          
          {/* Add Skill Form */}
          <form className="mt-5 flex" onSubmit={handleAddSkill}>
            <div className="flex-grow mr-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Enter a skill (e.g., JavaScript, React, Project Management)"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            <div className="mr-2 w-40">
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={addingSkill || !newSkill.trim()}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {addingSkill ? 'Adding...' : 'Add Skill'}
            </button>
          </form>
          
          {/* Skills List */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500">Your Skills</h4>
            {activeSkills.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500 italic">No skills added yet.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {activeSkills.map((skill) => (
                  <div key={skill.id} className="inline-flex rounded-full items-center py-1 pl-3 pr-1 bg-blue-100 text-sm font-medium text-blue-700">
                    <span>{skill.name}</span>
                    {skill.level && (
                      <span className="ml-1 text-xs text-blue-500 bg-blue-200 px-1.5 py-0.5 rounded-full">
                        {skill.level}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="flex-shrink-0 ml-1 h-5 w-5 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                    >
                      <span className="sr-only">Remove {skill.name}</span>
                      <svg className="h-2.5 w-2.5" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                        <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Job Preferences Section */}
      <div className="bg-white shadow sm:rounded-lg mt-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Job Preferences</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Set your preferences for job roles, locations, and minimum salary.</p>
          
          <form className="mt-5 space-y-4" onSubmit={handlePreferencesSubmit}>
            {preferencesError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{preferencesError}</span>
              </div>
            )}
            {preferencesSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{preferencesSuccess}</span>
              </div>
            )}
            
            <div>
              <label htmlFor="desired_roles" className="block text-sm font-medium text-gray-700">
                Desired Roles (comma separated)
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="desired_roles"
                  id="desired_roles"
                  value={preferences.desired_roles}
                  onChange={handlePreferencesChange}
                  placeholder="Software Engineer, Frontend Developer, etc."
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">List roles you're interested in, separated by commas.</p>
            </div>
            
            <div>
              <label htmlFor="desired_locations" className="block text-sm font-medium text-gray-700">
                Desired Locations (comma separated)
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="desired_locations"
                  id="desired_locations"
                  value={preferences.desired_locations}
                  onChange={handlePreferencesChange}
                  placeholder="Remote, New York, San Francisco, etc."
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">List locations you're interested in, separated by commas.</p>
            </div>
            
            <div>
              <label htmlFor="min_salary" className="block text-sm font-medium text-gray-700">
                Minimum Annual Salary
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="min_salary"
                  id="min_salary"
                  value={preferences.min_salary}
                  onChange={handlePreferencesChange}
                  placeholder="75000"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">Enter your minimum acceptable annual salary in USD.</p>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={savingPreferences}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
};

export default ProfilePage;
