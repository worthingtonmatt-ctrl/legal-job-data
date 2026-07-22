'use client';

import { useState, useEffect, useMemo } from 'react';

const STANDARDIZED_LEVELS = [
  'General Counsel',
  'Deputy General Counsel',
  'Associate General Counsel',
  'Assistant General Counsel',
  'Legal Counsel/Staff Attorney',
  'Title IX',
  'Intern',
  'Paralegal'
];

export default function AdminPortalPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [search, setSearch] = useState('');
  const [needingAttentionOnly, setNeedingAttentionOnly] = useState(false);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null); // null means creating new
  const [toast, setToast] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    institution_id: '',
    job_title: '',
    JD_required: true,
    standardized_level: 'Associate General Counsel',
    reports_to: '',
    salary_min: '',
    salary_max: '',
    is_commensurate_with_experience: false,
    min_years: '',
    pref_years: '',
    job_board_source: 'University Career Page',
    source_url: '',
    post_date: new Date().toISOString().split('T')[0]
  });

  // Check saved session password on mount
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('admin_password');
    if (savedPassword) {
      verifyPassword(savedPassword);
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const verifyPassword = async (passToVerify) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passToVerify })
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('admin_password', passToVerify);
        setAuthenticated(true);
        loadData(passToVerify);
      } else {
        setAuthError(data.error || 'Incorrect password.');
        sessionStorage.removeItem('admin_password');
        setAuthenticated(false);
      }
    } catch (err) {
      setAuthError('Error verifying password. Please try again.');
      sessionStorage.removeItem('admin_password');
      setAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadData = async (passKey) => {
    const activePassword = passKey || sessionStorage.getItem('admin_password');
    if (!activePassword) return;

    setLoadingJobs(true);
    try {
      const [jobsRes, instRes] = await Promise.all([
        fetch(`/api/admin/jobs?needing_attention=${needingAttentionOnly}&search=${encodeURIComponent(search)}`, {
          headers: { 'X-Admin-Password': activePassword }
        }),
        fetch('/api/admin/institutions', {
          headers: { 'X-Admin-Password': activePassword }
        })
      ]);

      const jobsData = await jobsRes.json();
      const instData = await instRes.json();

      if (jobsData.success) {
        setJobs(jobsData.data);
      } else {
        showToast(jobsData.error || 'Failed to fetch jobs', 'error');
      }

      if (instData.success) {
        setInstitutions(instData.data);
      }
    } catch (err) {
      showToast('Error loading database records', 'error');
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [search, needingAttentionOnly, authenticated]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_password');
    setAuthenticated(false);
    setPassword('');
  };

  const handleOpenEdit = (job) => {
    setEditingJob(job);
    setFormData({
      institution_id: job.institution_id || '',
      job_title: job.job_title || '',
      JD_required: Boolean(job.JD_required),
      standardized_level: job.standardized_level || 'Associate General Counsel',
      reports_to: job.reports_to || '',
      salary_min: job.salary_min !== null && job.salary_min !== undefined ? job.salary_min : '',
      salary_max: job.salary_max !== null && job.salary_max !== undefined ? job.salary_max : '',
      is_commensurate_with_experience: Boolean(job.is_commensurate_with_experience),
      min_years: job.min_years !== null && job.min_years !== undefined ? job.min_years : '',
      pref_years: job.pref_years !== null && job.pref_years !== undefined ? job.pref_years : '',
      job_board_source: job.job_board_source || 'University Career Page',
      source_url: job.source_url || '',
      post_date: job.post_date || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingJob(null);
    setFormData({
      institution_id: institutions[0]?.id || '',
      job_title: '',
      JD_required: true,
      standardized_level: 'Associate General Counsel',
      reports_to: '',
      salary_min: '',
      salary_max: '',
      is_commensurate_with_experience: false,
      min_years: '',
      pref_years: '',
      job_board_source: 'University Career Page',
      source_url: '',
      post_date: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const activePassword = sessionStorage.getItem('admin_password');
    if (!activePassword) return;

    setFormSubmitting(true);
    try {
      const isEdit = Boolean(editingJob);
      const url = '/api/admin/jobs';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        id: isEdit ? editingJob.id : undefined
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': activePassword
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast(isEdit ? 'Job posting updated successfully!' : 'Job posting created successfully!');
        setIsModalOpen(false);
        loadData();
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      showToast('Error saving job posting', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job posting record?')) return;
    const activePassword = sessionStorage.getItem('admin_password');
    if (!activePassword) return;

    try {
      const res = await fetch(`/api/admin/jobs?id=${jobId}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Password': activePassword }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Job posting deleted');
        loadData();
      } else {
        showToast(data.error || 'Failed to delete posting', 'error');
      }
    } catch (err) {
      showToast('Error deleting record', 'error');
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = jobs.length;
    const missingSalaryOrExp = jobs.filter(
      j => (j.salary_min === null && !j.is_commensurate_with_experience) || j.min_years === null
    ).length;
    const complete = total - missingSalaryOrExp;
    return { total, missingSalaryOrExp, complete };
  }, [jobs]);

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '1.5rem'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2.5rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
              Management Console Access
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Enter administrator password to adjust job postings database.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); verifyPassword(password); }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#0b1120',
                  border: authError ? '1px solid #ef4444' : '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              {authError && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.825rem', color: '#f87171' }}>
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: '600',
                border: 'none',
                cursor: authLoading ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                transition: 'transform 0.1s, filter 0.2s'
              }}
            >
              {authLoading ? 'Verifying...' : 'Unlock Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090d16',
      color: '#f1f5f9',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      paddingBottom: '4rem'
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '1rem 1.5rem',
          borderRadius: '10px',
          backgroundColor: toast.type === 'error' ? '#7f1d1d' : '#065f46',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: '500',
          border: toast.type === 'error' ? '1px solid #ef4444' : '1px solid #10b981'
        }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}

      {/* Header Bar */}
      <header style={{
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '0.5rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>
                Job Posting Data Management
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Manual Adjustment & Salary/Experience Parser Override Console
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleOpenCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <span>+</span> Add Posting
            </button>

            <button
              onClick={handleLogout}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }}
            >
              Lock Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1320px', margin: '2rem auto 0', padding: '0 2rem' }}>
        {/* Metric Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem'
          }}>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Loaded Records
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
              {stats.total}
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem'
          }}>
            <p style={{ fontSize: '0.8rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Needs Attention (Missing Salary / Exp)
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#f59e0b' }}>
              {stats.missingSalaryOrExp}
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem'
          }}>
            <p style={{ fontSize: '0.8rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Complete Records
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#10b981' }}>
              {stats.complete}
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <span style={{ color: '#64748b' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by job title, university name, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: '#cbd5e1',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={needingAttentionOnly}
                onChange={(e) => setNeedingAttentionOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }}
              />
              Show only postings needing attention
            </label>

            <button
              onClick={() => loadData()}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Job Postings Table */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {loadingJobs ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
              Loading database postings...
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
              No job postings found matching criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(2, 6, 23, 0.4)',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em'
                  }}>
                    <th style={{ padding: '1rem 1.25rem' }}>Posting Date</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Institution</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Job Title & Level</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Salary Data</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Required Exp</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const isMissingInfo = (job.salary_min === null && !job.is_commensurate_with_experience) || job.min_years === null;
                    return (
                      <tr
                        key={job.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <td style={{ padding: '1rem 1.25rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {job.post_date}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: '500', color: '#f1f5f9' }}>
                          <div>{job.inst_name}</div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {job.city_location}, {job.state_location}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: '600', color: '#818cf8' }}>{job.job_title}</div>
                          <span style={{
                            display: 'inline-block',
                            marginTop: '0.25rem',
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc',
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                          }}>
                            {job.standardized_level}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#e2e8f0' }}>
                          {job.salary_min ? (
                            <span>
                              ${job.salary_min.toLocaleString()}
                              {job.salary_max ? ` - $${job.salary_max.toLocaleString()}` : ''}
                            </span>
                          ) : job.is_commensurate_with_experience ? (
                            <span style={{ color: '#38bdf8', fontStyle: 'italic' }}>Commensurate</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#e2e8f0' }}>
                          {job.min_years !== null ? `${job.min_years} yrs` : <span style={{ color: '#ef4444' }}>Missing</span>}
                          {job.pref_years !== null && ` (${job.pref_years} pref)`}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {isMissingInfo ? (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                              Attention Needed
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                              Complete
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleOpenEdit(job)}
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: '6px',
                              backgroundColor: '#3b82f6',
                              color: '#ffffff',
                              fontWeight: '500',
                              fontSize: '0.8rem',
                              border: 'none',
                              marginRight: '0.5rem',
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            style={{
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              fontSize: '0.8rem',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                {editingJob ? 'Manual Job Posting Adjustment' : 'Create New Job Posting'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Institution selection */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Institution *
                  </label>
                  <select
                    value={formData.institution_id}
                    onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="" disabled>Select Institution...</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.city_location}, {inst.state_location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="e.g. Associate General Counsel"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Standardized Level */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Standardized Level *
                  </label>
                  <select
                    value={formData.standardized_level}
                    onChange={(e) => setFormData({ ...formData, standardized_level: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  >
                    {STANDARDIZED_LEVELS.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                {/* Salary Min */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Salary Minimum ($)
                  </label>
                  <input
                    type="number"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                    placeholder="e.g. 110000"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Salary Max */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Salary Maximum ($)
                  </label>
                  <input
                    type="number"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                    placeholder="e.g. 155000"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Min Years */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Minimum Required Years
                  </label>
                  <input
                    type="number"
                    value={formData.min_years}
                    onChange={(e) => setFormData({ ...formData, min_years: e.target.value })}
                    placeholder="e.g. 5"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Preferred Years */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Preferred Years
                  </label>
                  <input
                    type="number"
                    value={formData.pref_years}
                    onChange={(e) => setFormData({ ...formData, pref_years: e.target.value })}
                    placeholder="e.g. 7"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Reports To */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Reports To
                  </label>
                  <input
                    type="text"
                    value={formData.reports_to}
                    onChange={(e) => setFormData({ ...formData, reports_to: e.target.value })}
                    placeholder="e.g. Vice President & General Counsel"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Post Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Posting Date *
                  </label>
                  <input
                    type="date"
                    value={formData.post_date}
                    onChange={(e) => setFormData({ ...formData, post_date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Job Board Source */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Job Board Source *
                  </label>
                  <input
                    type="text"
                    value={formData.job_board_source}
                    onChange={(e) => setFormData({ ...formData, job_board_source: e.target.value })}
                    placeholder="e.g. HigherEdJobs, University Site"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Source URL */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: '500' }}>
                    Source URL *
                  </label>
                  <input
                    type="url"
                    value={formData.source_url}
                    onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                    placeholder="https://..."
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Toggles */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.JD_required}
                      onChange={(e) => setFormData({ ...formData, JD_required: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                    />
                    JD Degree Required
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_commensurate_with_experience}
                      onChange={(e) => setFormData({ ...formData, is_commensurate_with_experience: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#38bdf8' }}
                    />
                    Salary Commensurate with Experience
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: formSubmitting ? 'wait' : 'pointer',
                    boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.4)'
                  }}
                >
                  {formSubmitting ? 'Saving...' : editingJob ? 'Save Adjustments' : 'Create Job Posting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
