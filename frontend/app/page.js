'use client';

import { useState, useEffect, useMemo } from 'react';

const COL_INDEX = {
  'HI': 179.0, 'DC': 148.7, 'MA': 148.4, 'CA': 137.6, 'NY': 125.1, 'AK': 124.4, 'MD': 119.5,
  'OR': 114.3, 'CT': 113.9, 'NH': 113.3, 'VT': 112.5, 'ME': 112.2, 'NJ': 111.2, 'RI': 110.7,
  'WA': 110.4, 'CO': 105.5, 'NV': 103.3, 'UT': 102.8, 'AZ': 102.3, 'PA': 101.4, 'ID': 100.3,
  'MT': 100.1, 'DE': 100.1, 'FL': 100.1, 'VA': 99.8, 'ND': 98.7, 'SD': 98.1, 'MN': 97.4,
  'TX': 93.0, 'WI': 92.9, 'NM': 92.5, 'WY': 92.3, 'NC': 92.2, 'MI': 91.9, 'SC': 91.8,
  'IL': 91.2, 'OH': 90.7, 'IN': 90.6, 'AR': 90.6, 'TN': 90.4, 'NE': 90.1, 'IA': 89.7,
  'KY': 89.6, 'LA': 89.3, 'MO': 88.4, 'GA': 88.4, 'AL': 88.1, 'WV': 87.8, 'KS': 87.5,
  'OK': 86.8, 'MS': 85.3
};
// SVG Icon Components for beautiful zero-dependency UI
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const STANDARD_LEVELS = [
  'General Counsel',
  'Deputy General Counsel',
  'Associate General Counsel',
  'Assistant General Counsel',
  'Legal Counsel/Staff Attorney',
  'Title IX',
  'Paralegal',
  'Intern'
];

export default function Home() {
  // DB & Loading States
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User Profile States (Initialized to 0)
  const [userSalary, setUserSalary] = useState(0);
  const [userExperience, setUserExperience] = useState(0);
  const [userLevel, setUserLevel] = useState('Assistant General Counsel');

  // Calculator inputs for regression prediction
  const [predictLevel, setPredictLevel] = useState('Assistant General Counsel');
  const [predictExp, setPredictExp] = useState(8);
  const [predictPrivate, setPredictPrivate] = useState(false);
  const [predictState, setPredictState] = useState('NY');
  const [predictEnrollment, setPredictEnrollment] = useState(15000);

  // UI Filtering & Sorting States
  const [searchText, setSearchText] = useState('');
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedState, setSelectedState] = useState('All');
  const [maxExpFilter, setMaxExpFilter] = useState(15);
  const [onlyQualified, setOnlyQualified] = useState(false);
  const [onlySalary, setOnlySalary] = useState(false);
  const [includeNonJD, setIncludeNonJD] = useState(false);
  const [sortBy, setSortBy] = useState('post_date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Active Tab
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'analytics'

  // Drawer status for job descriptions
  const [expandedJobIds, setExpandedJobIds] = useState({});

  // Sync state with localStorage if client side (Optional convenience)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSalary = localStorage.getItem('benchmark_user_salary');
      const savedExp = localStorage.getItem('benchmark_user_exp');
      const savedLevel = localStorage.getItem('benchmark_user_level');
      
      if (savedSalary) setUserSalary(parseInt(savedSalary));
      if (savedExp) setUserExperience(parseInt(savedExp));
      if (savedLevel) setUserLevel(savedLevel);
    }
  }, []);

  const saveProfileToLocalStorage = (salary, exp, level) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('benchmark_user_salary', salary);
      localStorage.setItem('benchmark_user_exp', exp);
      localStorage.setItem('benchmark_user_level', level);
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Jobs
        const jobsRes = await fetch(`/api/jobs?include_non_jd=${includeNonJD}`);
        const jobsData = await jobsRes.json();
        
        if (!jobsData.success) {
          throw new Error(jobsData.error || 'Failed to fetch jobs.');
        }
        
        // Fetch Stats
        const statsRes = await fetch(`/api/stats?include_non_jd=${includeNonJD}`);
        const statsData = await statsRes.json();
        
        if (!statsData.success) {
          throw new Error(statsData.error || 'Failed to fetch statistics.');
        }

        setJobs(jobsData.data || []);
        setStats(statsData.data.stats || []);
        setStatesList(statsData.data.states || []);

        // Fetch Regression Model
        try {
          const regRes = await fetch('/api/regression');
          const regData = await regRes.json();
          if (regData.success) {
            setModelData(regData.model);
          }
        } catch (regErr) {
          console.warn('Could not load regression model coefficients:', regErr);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [includeNonJD]);

  // Toggle description drawer
  const toggleDescription = (id) => {
    setExpandedJobIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Level Selection handlers
  const handleLevelChange = (level) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level) 
        : [...prev, level]
    );
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedLevels([]);
    setSelectedState('All');
    setMaxExpFilter(15);
    setOnlyQualified(false);
    setOnlySalary(false);
    setIncludeNonJD(false);
    setSortBy('post_date');
    setSortOrder('desc');
  };

  // Live client-side filter and sort logic
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // 1. Text Search (Title, Institution, Location)
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(job => 
        job.job_title.toLowerCase().includes(q) || 
        job.inst_name.toLowerCase().includes(q) ||
        job.city_location.toLowerCase().includes(q) ||
        job.state_location.toLowerCase().includes(q)
      );
    }

    // 2. Levels Filter
    if (selectedLevels.length > 0) {
      result = result.filter(job => selectedLevels.includes(job.standardized_level));
    }

    // 3. State Location Filter
    if (selectedState !== 'All') {
      result = result.filter(job => job.state_location === selectedState);
    }

    // 4. Experience Slider Filter
    if (maxExpFilter < 15) {
      result = result.filter(job => job.min_years === null || job.min_years <= maxExpFilter);
    }

    // 5. Only Show Jobs I'm Qualified For (Toggle)
    if (onlyQualified) {
      result = result.filter(job => job.min_years === null || job.min_years <= userExperience);
    }

    // 6. Only Show Jobs with Salaries (Toggle)
    if (onlySalary) {
      result = result.filter(job => job.salary_min !== null || job.salary_max !== null);
    }

    // 7. Sort
    result.sort((a, b) => {
      let valA, valB;

      if (sortBy === 'post_date') {
        valA = a.post_date;
        valB = b.post_date;
      } else if (sortBy === 'salary_min') {
        // For salary, we prioritize sorting by min, falling back to max, then treating nulls as 0
        valA = a.salary_min !== null ? a.salary_min : (a.salary_max !== null ? a.salary_max : 0);
        valB = b.salary_min !== null ? b.salary_min : (b.salary_max !== null ? b.salary_max : 0);
      } else if (sortBy === 'min_years') {
        valA = a.min_years !== null ? a.min_years : 99; // Put nulls at the end or treat as 0
        valB = b.min_years !== null ? b.min_years : 99;
      } else if (sortBy === 'job_title') {
        valA = a.job_title.toLowerCase();
        valB = b.job_title.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [jobs, searchText, selectedLevels, selectedState, maxExpFilter, onlyQualified, onlySalary, sortBy, sortOrder, userExperience]);

  // Statistics & Benchmarking computed metrics
  const userLevelStats = useMemo(() => {
    return stats.find(s => s.standardized_level === userLevel) || null;
  }, [stats, userLevel]);

  const salaryComparisonText = useMemo(() => {
    if (!userLevelStats || !userLevelStats.avg_salary_mid) {
      return { text: 'No sufficient market data for comparison.', status: 'neutral', diff: 0, pct: 0 };
    }
    const diff = userSalary - userLevelStats.avg_salary_mid;
    const pct = Math.round((Math.abs(diff) / userLevelStats.avg_salary_mid) * 100);
    const formattedDiff = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.abs(diff));

    if (diff > 5000) {
      return {
        text: `Your salary is ${formattedDiff} (+${pct}%) above the average market mid-point (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userLevelStats.avg_salary_mid)}) for a ${userLevel}.`,
        status: 'positive',
        diff,
        pct
      };
    } else if (diff < -5000) {
      return {
        text: `Your salary is ${formattedDiff} (-${pct}%) below the average market mid-point (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userLevelStats.avg_salary_mid)}) for a ${userLevel}. You are earning less than the market average!`,
        status: 'negative',
        diff,
        pct
      };
    } else {
      return {
        text: `Your salary aligns with the market mid-point (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userLevelStats.avg_salary_mid)}) for a ${userLevel}.`,
        status: 'neutral',
        diff,
        pct
      };
    }
  }, [userLevelStats, userSalary, userLevel]);

  // Calculate standard deviations and distributions of experience by title on the client side
  const levelExpStats = useMemo(() => {
    const groups = {};
    jobs.forEach(job => {
      if (job.min_years !== null) {
        const lvl = job.standardized_level;
        if (!groups[lvl]) {
          groups[lvl] = [];
        }
        groups[lvl].push(job.min_years);
      }
    });

    const statsMap = {};
    Object.keys(groups).forEach(lvl => {
      const vals = groups[lvl];
      const count = vals.length;
      if (count === 0) return;

      const sum = vals.reduce((s, v) => s + v, 0);
      const avg = sum / count;

      // Sample variance and standard deviation
      let stdDev = 0;
      if (count > 1) {
        const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (count - 1);
        stdDev = Math.sqrt(variance);
      }

      statsMap[lvl] = {
        avg: Math.round(avg * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        count
      };
    });

    return statsMap;
  }, [jobs]);

  const userZScore = useMemo(() => {
    const currentStats = levelExpStats[userLevel];
    if (!currentStats || currentStats.stdDev === 0) return null;
    return (userExperience - currentStats.avg) / currentStats.stdDev;
  }, [levelExpStats, userExperience, userLevel]);

  // Upgrade Potential List
  // Determine if user's experience meets or exceeds typical requirements for higher levels
  const titleUpgradePotential = useMemo(() => {
    const levelHierarchy = [
      'Intern',
      'Paralegal',
      'Title IX',
      'Legal Counsel/Staff Attorney',
      'Assistant General Counsel',
      'Associate General Counsel',
      'Deputy General Counsel',
      'General Counsel'
    ];

    const currentIdx = levelHierarchy.indexOf(userLevel);
    
    return stats
      .filter(s => {
        const idx = levelHierarchy.indexOf(s.standardized_level);
        // We only consider higher or equal levels
        return idx >= currentIdx;
      })
      .map(s => {
        const lvl = s.standardized_level;
        const clientStats = levelExpStats[lvl] || { avg: s.avg_min_years || 2.0, stdDev: 1.0 };
        const avgReq = clientStats.avg;
        const stdDev = clientStats.stdDev || 1.0;
        
        const isQualified = userExperience >= avgReq;
        const diff = userExperience - avgReq;
        
        // Z-score calculation representing how far above/below the mean the user is
        const zScore = (userExperience - avgReq) / (stdDev || 1.0);

        return {
          level: lvl,
          avgReq,
          stdDev,
          isQualified,
          diff: Math.round(diff * 10) / 10,
          zScore: Math.round(zScore * 100) / 100,
          avgSalaryMid: s.avg_salary_mid
        };
      })
      .sort((a, b) => levelHierarchy.indexOf(b.level) - levelHierarchy.indexOf(a.level)); // Sort highest level first
  }, [stats, levelExpStats, userExperience, userLevel]);

  const titleUpgradeStatus = useMemo(() => {
    const levelHierarchy = [
      'Intern',
      'Paralegal',
      'Title IX',
      'Legal Counsel/Staff Attorney',
      'Assistant General Counsel',
      'Associate General Counsel',
      'Deputy General Counsel',
      'General Counsel'
    ];

    const currentIdx = levelHierarchy.indexOf(userLevel);
    if (currentIdx === -1 || currentIdx === levelHierarchy.length - 1) {
      return {
        value: 'Highest Tier',
        statusClass: 'neutral',
        desc: 'You have reached the highest organizational tier (General Counsel).'
      };
    }

    const nextLevel = levelHierarchy[currentIdx + 1];
    
    // Look up stats for next position from our client-side calculations
    const nextStats = levelExpStats[nextLevel];
    if (!nextStats) {
      // Fallback if no listings exist for the next level
      return {
        value: 'Developing / Building',
        statusClass: 'neutral',
        desc: `You are successfully building the experience typical of your current tier (no market postings available for ${nextLevel}).`
      };
    }

    const avgReq = nextStats.avg;
    const stdDev = nextStats.stdDev || 1.0;
    const diff = userExperience - avgReq;
    const z = diff / stdDev;

    if (z >= 1.0) {
      return {
        value: 'Beyond Due (Extreme)',
        statusClass: 'negative', // Red color for overdue promotion
        desc: `Your experience outstrips 84% of the market baseline for the higher tier (${avgReq} ± ${stdDev}y). You have hit the structural ceiling.`
      };
    } else if (userExperience >= avgReq) {
      return {
        value: 'Highly Competitive',
        statusClass: 'positive', // Green color
        desc: `You meet or exceed the average entry requirements for the next tier (${avgReq} ± ${stdDev}y). You are fully market-ready.`
      };
    } else {
      const yearsNeeded = Math.ceil(avgReq - userExperience);
      return {
        value: 'Developing / Building',
        statusClass: 'neutral', // Blue color
        desc: `You are successfully building the experience typical of your current tier (requires ~${yearsNeeded} more years to reach the next tier average of ${avgReq}y).`
      };
    }
  }, [levelExpStats, userExperience, userLevel]);


  // Count targetable high-value jobs (Qualified AND pays more than user salary)
  const highValueJobsCount = useMemo(() => {
    return jobs.filter(job => {
      const isQualified = job.min_years === null || job.min_years <= userExperience;
      const paysMore = job.salary_min !== null && job.salary_min > userSalary;
      const maxPaysMore = job.salary_max !== null && job.salary_max > userSalary;
      return isQualified && (paysMore || maxPaysMore);
    }).length;
  }, [jobs, userExperience, userSalary]);

  // Calculate user salary vs average starting minimum salary for their experience level
  const experienceLevelStats = useMemo(() => {
    // Filter jobs that have both salary_min and min_years, and exclude "Legal Counsel/Staff Attorney" roles
    const validJobs = jobs.filter(j => j.salary_min !== null && j.min_years !== null && j.standardized_level !== 'Legal Counsel/Staff Attorney');
    if (validJobs.length === 0) {
      return { avg: 0, diff: 0, status: 'neutral', label: 'no data', targetYear: null };
    }

    // Get list of unique years that have data
    const availableYears = Array.from(new Set(validJobs.map(j => j.min_years))).sort((a, b) => a - b);
    
    // Check if we have an exact match
    const hasExactMatch = availableYears.includes(userExperience);
    
    let targetYear = null;
    
    if (hasExactMatch) {
      targetYear = userExperience;
    } else {
      // Find the next year where we do have data
      // First look for the next year down (highest available year < userExperience)
      const yearsLess = availableYears.filter(y => y < userExperience);
      if (yearsLess.length > 0) {
        targetYear = Math.max(...yearsLess);
      } else {
        // If no years less, default to the next year up (lowest available year overall)
        targetYear = Math.min(...availableYears);
      }
    }

    const targetJobs = validJobs.filter(j => j.min_years === targetYear);
    const avg = targetJobs.reduce((sum, j) => sum + j.salary_min, 0) / targetJobs.length;
    const diff = userSalary - avg;

    return {
      avg: Math.round(avg),
      diff: Math.round(diff),
      status: diff >= 0 ? 'positive' : 'negative',
      label: `vs. ${targetYear}y Avg Starting Min`,
      targetYear
    };
  }, [jobs, userExperience, userSalary]);

  // Determine absolute bounds for salary chart - locked at 0 to 300k as requested by user
  const salaryChartBounds = { min: 0, max: 300000 };

  // Calculate average starting salary grouped by min_years of experience
  const salaryByExperience = useMemo(() => {
    const groups = {};
    filteredAndSortedJobs.forEach(job => {
      if (job.min_years !== null && job.salary_min !== null && job.standardized_level !== 'Legal Counsel/Staff Attorney') {
        const y = job.min_years;
        if (!groups[y]) {
          groups[y] = { sum: 0, count: 0, years: y };
        }
        groups[y].sum += job.salary_min;
        groups[y].count += 1;
      }
    });

    return Object.values(groups)
      .map(g => ({
        years: g.years,
        avg_salary_min: Math.round(g.sum / g.count),
        count: g.count
      }))
      .sort((a, b) => a.years - b.years);
  }, [filteredAndSortedJobs]);

  // Synchronize calculator inputs with user profile inputs initially or when they change
  useEffect(() => {
    const OLS_LEVELS = [
      'General Counsel',
      'Deputy General Counsel',
      'Associate General Counsel',
      'Assistant General Counsel'
    ];
    if (OLS_LEVELS.includes(userLevel)) {
      setPredictLevel(userLevel);
    } else {
      setPredictLevel('Assistant General Counsel');
    }
  }, [userLevel]);

  useEffect(() => {
    setPredictExp(userExperience);
  }, [userExperience]);

  const prediction = useMemo(() => {
    // Fallback constants from regression analysis
    const fallbackIntercept = 13173.6139;
    const fallbackMinYears = 11403.2161;
    const fallbackIsPrivate = 50041.1320;
    const fallbackCol = 445.3013;
    const fallbackEnrollment = 1.4874;
    const fallbackLevels = {
      'General Counsel': 63428.6186,
      'Deputy General Counsel': 31841.0224,
      'Associate General Counsel': -6419.7070,
      'Assistant General Counsel': 0.0
    };
    const fallbackMae = 25205.03;

    const colIndex = COL_INDEX[predictState] || 100.0;

    if (!modelData || !modelData.success || !modelData.results) {
      let pred = fallbackIntercept + (predictExp * fallbackMinYears);
      if (predictPrivate) pred += fallbackIsPrivate;
      pred += colIndex * fallbackCol;
      pred += predictEnrollment * fallbackEnrollment;
      pred += fallbackLevels[predictLevel] || 0.0;

      return {
        predicted: pred,
        mae: fallbackMae,
        minRange: Math.max(0, pred - fallbackMae),
        maxRange: pred + fallbackMae
      };
    }

    // Dynamic computation from API
    const findCoef = (name) => {
      const match = modelData.results.find(r => r.feature === name);
      return match ? match.coef : 0.0;
    };

    const intercept = findCoef('Intercept') || fallbackIntercept;
    const coefExp = findCoef('min_years') || fallbackMinYears;
    const coefPrivate = findCoef('is_private') || fallbackIsPrivate;
    const coefCol = findCoef('col_index') || fallbackCol;
    const coefEnrollment = findCoef('estimated_enrollment') || fallbackEnrollment;

    let pred = intercept + (predictExp * coefExp);
    if (predictPrivate) pred += coefPrivate;
    pred += colIndex * coefCol;
    pred += predictEnrollment * coefEnrollment;

    if (predictLevel !== 'Assistant General Counsel') {
      pred += findCoef(predictLevel);
    }

    const mae = modelData.mae || fallbackMae;

    return {
      predicted: pred,
      mae: mae,
      minRange: Math.max(0, pred - mae),
      maxRange: pred + mae
    };
  }, [modelData, predictLevel, predictExp, predictPrivate, predictState, predictEnrollment]);

  const userComparison = useMemo(() => {
    const diff = userSalary - prediction.predicted;
    const formattedDiff = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.abs(diff));
    const formattedPredicted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prediction.predicted);

    if (diff > 5000) {
      return {
        text: `Your salary is ${formattedDiff} above the predicted market midpoint (${formattedPredicted}) for this profile.`,
        status: 'positive',
        diff,
      };
    } else if (diff < -5000) {
      return {
        text: `Your salary is ${formattedDiff} below the predicted market midpoint (${formattedPredicted}) for this profile. You may be underpaid relative to current postings!`,
        status: 'negative',
        diff,
      };
    } else {
      return {
        text: `Your salary aligns with the predicted market midpoint (${formattedPredicted}) for this profile.`,
        status: 'neutral',
        diff,
      };
    }
  }, [userSalary, prediction.predicted]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header" id="main-header">
        <div className="header-title-section">
          <h1>HigherEd Legal Careers & Salary Tracker</h1>
          <p>Local market intelligence and benchmarking tool for university in-house counsel</p>
        </div>
        <div className="db-status" id="db-status-badge">
          <span className="status-dot"></span>
          <span className="status-label">Database Status:</span>
          <span className="status-value">{jobs.length} Active Listings</span>
        </div>
      </header>

      {error && (
        <div className="glass-card" style={{ borderColor: 'var(--danger)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AlertTriangleIcon />
          <div>
            <h3 style={{ color: 'var(--danger)', marginBottom: '0.2rem' }}>Connection/Query Error</h3>
            <p style={{ color: 'var(--text-muted)' }}>{error}. Please ensure the server and the SQLite database file exist.</p>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="dashboard-grid">
        
        {/* Sidebar Controls */}
        <aside className="sidebar">
          
          {/* Section 1: My Profile Benchmarking */}
          <div className="glass-card" id="profile-card">
            <h2 className="card-title">
              <UserIcon />
              My Benchmarking Profile
            </h2>
            <div className="form-grid">
              
              <div className="form-group">
                <label htmlFor="user-salary-input">
                  Current Salary
                  <span className="label-hint">USD / Year</span>
                </label>
                <div className="input-with-symbol">
                  <span className="input-symbol">$</span>
                  <input 
                    type="number" 
                    id="user-salary-input" 
                    className="form-input" 
                    value={userSalary} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setUserSalary(val);
                      saveProfileToLocalStorage(val, userExperience, userLevel);
                    }}
                    step="5000"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="user-experience-input">
                  Experience Years
                  <span className="label-hint">{userExperience} years</span>
                </label>
                <div className="slider-container">
                  <input 
                    type="range" 
                    id="user-experience-input" 
                    className="form-range" 
                    min="0" 
                    max="20" 
                    step="1"
                    value={userExperience}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setUserExperience(val);
                      saveProfileToLocalStorage(userSalary, val, userLevel);
                    }}
                  />
                  <span className="slider-val">{userExperience}y</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="user-level-input">Current Level</label>
                <select 
                  id="user-level-input" 
                  className="form-select"
                  value={userLevel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserLevel(val);
                    saveProfileToLocalStorage(userSalary, userExperience, val);
                  }}
                >
                  {STANDARD_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Section 2: Search & Board Filters */}
          <div className="glass-card" id="filters-card">
            <h2 className="card-title">
              <FilterIcon />
              Search & Filters
            </h2>
            <div className="form-grid">
              
              <div className="form-group">
                <label htmlFor="search-input">Search Text</label>
                <div className="input-with-symbol">
                  <span className="input-symbol" style={{ left: '0.75rem', display: 'flex', alignItems: 'center' }}>
                    <SearchIcon />
                  </span>
                  <input 
                    type="text" 
                    id="search-input" 
                    className="form-input" 
                    style={{ paddingLeft: '2.2rem' }}
                    placeholder="Title, campus, city..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Job Levels</label>
                <div className="checkbox-list" id="levels-filter-list">
                  {STANDARD_LEVELS.map(level => (
                    <label key={level} className="checkbox-label" id={`label-${level.replace(/\s+/g, '-').toLowerCase()}`}>
                      <input 
                        type="checkbox" 
                        id={`check-${level.replace(/\s+/g, '-').toLowerCase()}`}
                        checked={selectedLevels.includes(level)} 
                        onChange={() => handleLevelChange(level)}
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="state-filter-select">Location (State)</label>
                <select 
                  id="state-filter-select" 
                  className="form-select"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                >
                  <option value="All">All States</option>
                  {statesList.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="max-experience-filter">
                  Max Required Experience
                  <span className="label-hint">{maxExpFilter === 15 ? 'Show All' : `${maxExpFilter} years or less`}</span>
                </label>
                <div className="slider-container">
                  <input 
                    type="range" 
                    id="max-experience-filter" 
                    className="form-range" 
                    min="0" 
                    max="15" 
                    step="1"
                    value={maxExpFilter}
                    onChange={(e) => setMaxExpFilter(parseInt(e.target.value))}
                  />
                  <span className="slider-val">{maxExpFilter === 15 ? 'All' : `${maxExpFilter}y`}</span>
                </div>
              </div>

              <div className="toggle-group" style={{ marginTop: '0.5rem' }}>
                <label className="toggle-label" id="qualified-toggle-label">
                  <span>Show Qualified Roles Only</span>
                  <span className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="qualified-toggle"
                      checked={onlyQualified} 
                      onChange={(e) => setOnlyQualified(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </span>
                </label>

                <label className="toggle-label" id="salary-toggle-label">
                  <span>Show Salary Postings Only</span>
                  <span className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="salary-toggle"
                      checked={onlySalary} 
                      onChange={(e) => setOnlySalary(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </span>
                </label>

                <label className="toggle-label" id="non-jd-toggle-label">
                  <span>Include Non-JD Roles</span>
                  <span className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="non-jd-toggle"
                      checked={includeNonJD} 
                      onChange={(e) => setIncludeNonJD(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </span>
                </label>
              </div>

              <button 
                type="button" 
                className="btn-reset" 
                onClick={handleClearFilters}
                id="reset-filters-btn"
              >
                Clear Active Filters
              </button>

            </div>
          </div>

        </aside>

        {/* Main Content Area */}
        <main className="main-panel">
          
          {/* Interactive Navigation Tabs */}
          <div className="tabs-container">
            <div className="tab-buttons" role="tablist">
              <button 
                type="button"
                role="tab"
                aria-selected={activeTab === 'feed'}
                className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
                onClick={() => setActiveTab('feed')}
                id="tab-job-feed"
              >
                Active Job Postings
                <span className="tab-btn-badge">{filteredAndSortedJobs.length}</span>
              </button>
              <button 
                type="button"
                role="tab"
                aria-selected={activeTab === 'analytics'}
                className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
                id="tab-analytics"
              >
                Market Analytics
              </button>
              <button 
                type="button"
                role="tab"
                aria-selected={activeTab === 'regression'}
                className={`tab-btn ${activeTab === 'regression' ? 'active' : ''}`}
                onClick={() => setActiveTab('regression')}
                id="tab-regression"
              >
                Salary Predictor (Regression)
              </button>
            </div>

            {/* Sorting controls, only relevant in Job Feed */}
            {activeTab === 'feed' && (
              <div className="sort-controls" id="sort-controls-section">
                <span>Sort by:</span>
                <select 
                  className="sort-select" 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  id="sort-by-select"
                  aria-label="Sort job postings by"
                >
                  <option value="post_date">Date Posted</option>
                  <option value="salary_min">Starting Salary</option>
                  <option value="min_years">Required Experience</option>
                  <option value="job_title">Job Title</option>
                </select>
                <button 
                  type="button"
                  className="sort-dir-btn" 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                  id="sort-direction-btn"
                  aria-label={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                >
                  {sortOrder === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Summary Banner */}
          <section className="stats-banner-grid" aria-label="Quick stats metrics summary">
            <div className="stat-widget primary">
              <span className="stat-widget-label">Target Openings</span>
              <span className="stat-widget-value">{filteredAndSortedJobs.length}</span>
              <span className="stat-widget-desc">Matching current filters</span>
            </div>
            
            <div className="stat-widget success">
              <span className="stat-widget-label">Qualified Roles</span>
              <span className="stat-widget-value">
                {jobs.filter(job => job.min_years === null || job.min_years <= userExperience).length}
              </span>
              <span className="stat-widget-desc">Based on your {userExperience}y experience</span>
            </div>

            <div className="stat-widget accent">
              <span className="stat-widget-label">Salary Upgrade Targets</span>
              <span className="stat-widget-value">{highValueJobsCount}</span>
              <span className="stat-widget-desc">Qualifying jobs paying &gt; your salary</span>
            </div>
          </section>

          {/* TAB 1: ACTIVE JOB BOARD */}
          {activeTab === 'feed' && (
            <div className="job-feed-list" id="job-feed-container">
              
              {loading ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="status-dot" style={{ display: 'inline-block', margin: '0 auto 1rem' }}></div>
                  <p style={{ color: 'var(--text-muted)' }}>Connecting to SQLite database, reading listings...</p>
                </div>
              ) : filteredAndSortedJobs.length === 0 ? (
                <div className="glass-card no-jobs-card" id="no-jobs-matching-card">
                  <div className="no-jobs-icon">
                    <FilterIcon />
                  </div>
                  <h3>No jobs match your active filters</h3>
                  <p>Try broadening your state parameters, adjusting the experience threshold, or clearing text search query.</p>
                  <button type="button" className="btn-reset" style={{ width: 'auto', padding: '0.6rem 1.5rem' }} onClick={handleClearFilters}>
                    Reset Search & Filters
                  </button>
                </div>
              ) : (
                filteredAndSortedJobs.map(job => {
                  const meetsExp = job.min_years === null || job.min_years <= userExperience;
                  const expDiff = job.min_years !== null ? job.min_years - userExperience : 0;
                  const hasSalary = job.salary_min !== null || job.salary_max !== null;
                  
                  // Compute potential salary bump
                  const isSalaryUpgrade = job.salary_min !== null && job.salary_min > userSalary;
                  const maxSalaryUpgrade = job.salary_max !== null && job.salary_max > userSalary;
                  const salaryUpgradeValue = job.salary_min !== null 
                    ? job.salary_min - userSalary 
                    : (job.salary_max !== null ? job.salary_max - userSalary : 0);

                  return (
                    <article 
                      key={job.id} 
                      className={`glass-card job-card ${meetsExp ? 'qualified' : ''}`}
                      id={`job-card-${job.id}`}
                    >
                      
                      {/* Card Header */}
                      <div className="job-card-header">
                        <div className="job-card-title-area">
                          <h3>{job.job_title}</h3>
                          <div className="job-card-meta">
                            <span className="inst-name">{job.inst_name}</span>
                            <span className="dot-separator">•</span>
                            <span className="inst-location">
                              <MapPinIcon /> {job.city_location}, {job.state_location}
                            </span>
                          </div>
                        </div>
                        
                        <div className="job-badges">
                          <span className="badge badge-level">{job.standardized_level}</span>
                          <span className="badge badge-source">{job.job_board_source}</span>
                          {meetsExp ? (
                            <span className="badge badge-qualified">
                              <CheckIcon /> Qualified
                            </span>
                          ) : (
                            <span className="badge badge-unqualified">
                              Requires +{expDiff}y
                            </span>
                          )}
                          {hasSalary && (isSalaryUpgrade || maxSalaryUpgrade) && (
                            <span className="badge badge-salary-bump">
                              Salary Bump (+${Math.round(salaryUpgradeValue / 1000)}k)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Middle Details Grid */}
                      <div className="job-card-details">
                        
                        <div className="detail-item">
                          <span className="detail-label">Salary Info</span>
                          <span className="detail-value salary-range">
                            {job.salary_min !== null || job.salary_max !== null ? (
                              <>
                                {job.salary_min !== null ? `$${job.salary_min.toLocaleString()}` : 'Unspecified'}
                                {' - '}
                                {job.salary_max !== null ? `$${job.salary_max.toLocaleString()}` : 'Unspecified'}
                              </>
                            ) : job.is_commensurate_with_experience ? (
                              'Commensurate with experience'
                            ) : (
                              'Not listed'
                            )}
                          </span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-label">Experience Required</span>
                          <span className="detail-value">
                            {job.min_years !== null ? `${job.min_years} years min` : 'Not specified'} 
                            {job.pref_years !== null ? ` (${job.pref_years}y preferred)` : ''}
                          </span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-label">Required Credentials</span>
                          <span className="detail-value">
                            {job.JD_required === 1 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--success)' }}>
                                <ShieldCheckIcon /> JD Required / Bar
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Non-JD Role</span>
                            )}
                          </span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-label">Reports To</span>
                          <span className="detail-value">
                            {job.reports_to || 'Not specified'}
                          </span>
                        </div>

                      </div>

                      {/* Card Footer actions */}
                      <div className="job-card-footer">
                        <span className="post-date">
                          <CalendarIcon /> Posted: {job.post_date}
                        </span>
                        
                        <div className="action-links">
                          <button 
                            type="button" 
                            className="btn-toggle-desc"
                            onClick={() => toggleDescription(job.id)}
                            id={`toggle-desc-btn-${job.id}`}
                            aria-expanded={!!expandedJobIds[job.id]}
                          >
                            <InfoIcon /> {expandedJobIds[job.id] ? 'Hide Details' : 'View Job Summary'}
                          </button>
                          
                          <a 
                            href={job.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="link-apply"
                            id={`apply-link-${job.id}`}
                          >
                            Original Listing <ExternalLinkIcon />
                          </a>
                        </div>
                      </div>

                      {/* Drawer Expansion (Job Description summary/filtered compliance terms) */}
                      {expandedJobIds[job.id] && (
                        <div className="job-description-drawer" id={`desc-drawer-${job.id}`}>
                          <h4 style={{ color: 'var(--text-bright)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Job Overview (Cleaned Text)
                          </h4>
                          <p>{job.job_title} at {job.inst_name} located in {job.city_location}, {job.state_location}.</p>
                          <p style={{ marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.85rem' }}>
                            Note: The following content is parsed directly from the job board description:
                          </p>
                          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                            <strong>Position Hierarchy:</strong> Classified as a <strong>{job.standardized_level}</strong> level position. 
                            {job.reports_to && ` Under official reporting structures, this role reports to: ${job.reports_to}.`}
                            <br /><br />
                            <strong>Qualifications & Compensation:</strong> Requires a Juris Doctorate (JD) or bar admission: <strong>{job.JD_required ? 'Yes' : 'No'}</strong>.
                            The job board source reports experience boundaries at <strong>{job.min_years !== null ? `${job.min_years} years minimum` : 'Not specified'}</strong>.
                            {hasSalary ? ` Compensation ranges from $${job.salary_min?.toLocaleString()} to $${job.salary_max?.toLocaleString()} annually.` : ' Annual compensation is commensurate with candidate experience/credentials.'}
                          </div>
                        </div>
                      )}

                    </article>
                  );
                })
              )}

            </div>
          )}

          {/* TAB 2: MARKET ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="analytics-section" id="analytics-section-container">
              
              {/* Personal Benchmark Summary Banner */}
              <div className="benchmark-banner" id="benchmark-banner-summary">
                <div className="benchmark-banner-title">
                  <SparklesIcon />
                  Market Intelligence Report
                </div>
                <div className="benchmark-banner-text">
                  Based on your benchmark input of <strong>{userExperience} years of experience</strong> and a current salary of <strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userSalary)}</strong> as a <strong>{userLevel}</strong>:
                </div>
                
                <div className="benchmark-stats-row">
                  <div className="benchmark-stat-card" id="salary-diff-stat-card">
                    <span className="stat-widget-label">Salary vs Level Midpoint</span>
                    <span className={`benchmark-stat-num ${salaryComparisonText.status}`}>
                      {salaryComparisonText.diff >= 0 ? '+' : ''}
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(salaryComparisonText.diff)}
                    </span>
                    <span className="stat-widget-desc">
                      {userLevelStats && userLevelStats.avg_salary_mid ? `vs. ${userLevel} Mid (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userLevelStats.avg_salary_mid)})` : 'No Level Midpoint'}
                    </span>
                  </div>

                  <div className="benchmark-stat-card" id="title-upgrade-stat-card">
                    <span className="stat-widget-label">Title Upgrade Potential</span>
                    <span className={`benchmark-stat-num ${titleUpgradeStatus.statusClass}`}>
                      {titleUpgradeStatus.value}
                    </span>
                    <span className="stat-widget-desc">
                      {titleUpgradeStatus.desc}
                    </span>
                  </div>

                  <div className="benchmark-stat-card" id="experience-salary-stat-card">
                    <span className="stat-widget-label">Salary vs Experience Avg Min</span>
                    <span className={`benchmark-stat-num ${experienceLevelStats.status}`}>
                      {experienceLevelStats.diff >= 0 ? '+' : ''}
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(experienceLevelStats.diff)}
                    </span>
                    <span className="stat-widget-desc">
                      {experienceLevelStats.label} ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(experienceLevelStats.avg)})
                    </span>
                    <span className="stat-widget-subdesc" style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.2rem' }}>
                      (Compares against market starting minimums, not midpoints)
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  {salaryComparisonText.text}
                </p>
              </div>

              {/* Chart Component: Horizontal Salary Range Bars */}
              <div className="glass-card chart-card" id="salary-chart-card">
                <h3 className="card-title">
                  <DollarIcon />
                  Market Salary Ranges by Job Level
                </h3>
                
                <div className="chart-header-legend" id="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color range"></span>
                    <span>Market Salary Range (Avg Min - Max)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color user"></span>
                    <span>Your Salary ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userSalary)})</span>
                  </div>
                </div>

                <div className="salary-chart-wrapper" id="salary-chart-bars">
                  {stats.map(s => {
                    const hasSalaryStats = s.avg_salary_min !== null && s.avg_salary_max !== null;
                    if (!hasSalaryStats) return null;

                    // Compute percentages relative to dynamic bounds
                    const minPct = Math.max(0, ((s.avg_salary_min - salaryChartBounds.min) / (salaryChartBounds.max - salaryChartBounds.min)) * 100);
                    const maxPct = Math.min(100, ((s.avg_salary_max - salaryChartBounds.min) / (salaryChartBounds.max - salaryChartBounds.min)) * 100);
                    const widthPct = Math.max(1, maxPct - minPct);

                    // Compute marker position for user salary
                    const userMarkerPct = ((userSalary - salaryChartBounds.min) / (salaryChartBounds.max - salaryChartBounds.min)) * 100;
                    const showUserMarker = s.standardized_level === userLevel;

                    return (
                      <div className="chart-row" key={s.standardized_level} id={`chart-row-${s.standardized_level.replace(/\s+/g, '-').toLowerCase()}`}>
                        <div className="chart-row-label">
                          {s.standardized_level}
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dimmed)', fontWeight: '400' }}>
                            ({s.postings_with_salary}/{s.total_postings} with salary)
                          </span>
                        </div>
                        <div className="chart-row-visual-container">
                          <div className="chart-bar-axis"></div>
                          
                          {/* Range Bar */}
                          <div 
                            className="chart-bar-range"
                            style={{ left: `${minPct}%`, width: `${widthPct}%` }}
                            title={`${s.standardized_level}: $${s.avg_salary_min.toLocaleString()} - $${s.avg_salary_max.toLocaleString()}`}
                          >
                            <span className="chart-bar-min-lbl">${Math.round(s.avg_salary_min/1000)}k</span>
                            <span className="chart-bar-max-lbl">${Math.round(s.avg_salary_max/1000)}k</span>
                          </div>

                          {/* Live user salary marker on current level row */}
                          {showUserMarker && userMarkerPct >= 0 && userMarkerPct <= 100 && (
                            <div 
                              className="chart-user-salary-marker"
                              style={{ left: `${userMarkerPct}%` }}
                              id="chart-salary-marker"
                            ></div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* X-Axis labels */}
                  <div className="chart-axis-labels" id="chart-axis-labels">
                    <span>${Math.round(salaryChartBounds.min / 1000)}k</span>
                    <span>${Math.round((salaryChartBounds.min + (salaryChartBounds.max - salaryChartBounds.min) / 4) / 1000)}k</span>
                    <span>${Math.round((salaryChartBounds.min + (salaryChartBounds.max - salaryChartBounds.min) / 2) / 1000)}k</span>
                    <span>${Math.round((salaryChartBounds.min + 3 * (salaryChartBounds.max - salaryChartBounds.min) / 4) / 1000)}k</span>
                    <span>${Math.round(salaryChartBounds.max / 1000)}k</span>
                  </div>
                </div>

                <div className="disclaimer-card" id="analytics-disclaimer">
                  <InfoIcon />
                  <p>
                    Averages are aggregated directly from the active local SQLite database. 
                    Your personal salary marker will position itself on your selected Current Level row. 
                    Values are rounded to the nearest thousand.
                  </p>
                </div>
              </div>

              {/* Chart Component: Salary By Experience Years */}
              <div className="glass-card chart-card" id="experience-salary-chart-card">
                <h3 className="card-title">
                  <BriefcaseIcon />
                  Market Salary By Experience Years
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Average minimum starting salary mapped to minimum required experience, excluding Legal Counsel/Staff Attorney positions:
                </p>
                
                <div className="chart-header-legend">
                  <div className="legend-item">
                    <span className="legend-color range" style={{ backgroundColor: 'var(--accent)' }}></span>
                    <span>Average Starting Salary (Min)</span>
                  </div>
                </div>

                <div className="salary-chart-wrapper" id="experience-salary-chart-bars">
                  {salaryByExperience.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', padding: '1rem 0', textAlign: 'center', fontSize: '0.9rem' }}>
                      No active listings with both salary and required experience data.
                    </div>
                  ) : (
                    salaryByExperience.map(item => {
                      // Compute percentage relative to 300k max limit
                      const barPct = Math.min(100, Math.max(1, (item.avg_salary_min / 300000) * 100));

                      return (
                        <div className="chart-row" key={item.years} id={`exp-salary-row-${item.years}`}>
                          <div className="chart-row-label">
                            {item.years === 0 ? '0 Years (Entry)' : `${item.years} Year${item.years > 1 ? 's' : ''}`}
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dimmed)', fontWeight: '400' }}>
                              ({item.count} posting{item.count > 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="chart-row-visual-container">
                            <div className="chart-bar-axis"></div>
                            
                            {/* Value Bar */}
                            <div 
                              className="chart-bar-range"
                              style={{ left: '0%', width: `${barPct}%`, backgroundColor: 'var(--accent)', background: 'var(--accent)' }}
                              title={`${item.years} Years: $${item.avg_salary_min.toLocaleString()}`}
                            >
                              <span className="chart-bar-max-lbl" style={{ right: 'auto', left: '100%', transform: 'translateX(10px)', top: '-2px', color: 'var(--neutral-black)', fontSize: '0.85rem' }}>
                                ${item.avg_salary_min.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* X-Axis labels */}
                  <div className="chart-axis-labels">
                    <span>$0k</span>
                    <span>$75k</span>
                    <span>$150k</span>
                    <span>$225k</span>
                    <span>$300k</span>
                  </div>
                </div>
              </div>

              {/* Title Upgrade mapping list */}
              <div className="glass-card" id="experience-mapping-card">
                <h3 className="card-title">
                  <ShieldCheckIcon />
                  Experience &amp; Title Benchmark Analysis
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Universities place significant emphasis on years of experience. Check if your <strong>{userExperience} years of experience</strong> exceeds the typical requirements for higher organizational tiers, indicating your title may be underselling your capability:
                </p>

                <div className="exp-mapping-grid" id="experience-mapping-grid">
                  {titleUpgradePotential.map(t => {
                    const isCurrentLevel = t.level === userLevel;
                    const progressVal = Math.min(100, Math.max(5, (userExperience / t.avgReq) * 100));

                    return (
                      <div 
                        key={t.level}
                        className={`exp-mapping-card ${t.isQualified ? 'qualified' : ''} ${isCurrentLevel ? 'target' : ''}`}
                        id={`exp-card-${t.level.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <div className="exp-mapping-card-header">
                          <span className="exp-mapping-card-title">
                            {t.level} {isCurrentLevel && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '600' }}>(Current)</span>}
                          </span>
                          <span className="exp-mapping-avg-years">
                            Avg: {t.avgReq ? `${t.avgReq} ± ${t.stdDev} yrs` : 'Not specified'}
                          </span>
                        </div>
                        
                        <div className="exp-mapping-status">
                          {t.isQualified ? (
                            t.zScore >= 1.0 ? (
                              <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                <CheckIcon /> Overqualified (+{t.zScore.toFixed(1)} SD)
                              </span>
                            ) : (
                              <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                <CheckIcon /> Meets Market average
                                {t.diff > 0 ? ` (+${t.diff} yrs)` : ''}
                              </span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-dimmed)', fontSize: '0.85rem', fontWeight: '500' }}>
                              Requires +{Math.abs(t.diff)} more years
                            </span>
                          )}
                        </div>

                        <div className="exp-comparison-bar">
                          <div 
                            className={`exp-comparison-fill ${!t.isQualified ? 'insufficient' : ''} ${isCurrentLevel ? 'target-lvl' : ''}`}
                            style={{ width: `${progressVal}%` }}
                          ></div>
                        </div>

                        {t.avgSalaryMid && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Avg Mid Salary: <strong style={{ color: 'var(--accent)' }}>${t.avgSalaryMid.toLocaleString()}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: REGRESSION SALARY PREDICTOR */}
          {activeTab === 'regression' && (
            <div className="regression-section" id="regression-section-container">
              
              {/* Introduction Banner */}
              <div className="benchmark-banner" id="regression-banner-summary" style={{ background: 'var(--neutral-black)', color: '#ffffff' }}>
                <div className="benchmark-banner-title">
                  <SparklesIcon />
                  OLS Regression Salary Predictor
                </div>
                <div className="benchmark-banner-text">
                  This interactive tool uses an Ordinary Least Squares (OLS) linear regression model trained on active university attorney job listings. It computes the salary midpoint in real-time based on required experience, organizational tier, and institutional factors (funding status and enrollment size).
                </div>
              </div>

              {/* Calculator and Predictor Grid */}
              <div className="regression-grid">
                
                {/* Left Column: Calculator Controls */}
                <div className="glass-card regression-calculator-card">
                  <h3 className="card-title">
                    <UserIcon />
                    Predictor Parameters
                  </h3>
                  
                  <div className="form-grid">
                    
                    <div className="form-group">
                      <label htmlFor="predict-level-select">Job Level / Tier</label>
                      <select 
                        id="predict-level-select" 
                        className="form-select"
                        value={predictLevel}
                        onChange={(e) => setPredictLevel(e.target.value)}
                      >
                        <option value="General Counsel">General Counsel</option>
                        <option value="Deputy General Counsel">Deputy General Counsel</option>
                        <option value="Associate General Counsel">Associate General Counsel</option>
                        <option value="Assistant General Counsel">Assistant General Counsel (Reference Group)</option>
                      </select>
                      <span className="label-hint" style={{ fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                        *Assistant General Counsel acts as the reference level (no baseline premium/discount).
                      </span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="predict-experience-slider">
                        Minimum Required Experience
                        <span className="label-hint">{predictExp} years</span>
                      </label>
                      <div className="slider-container">
                        <input 
                          type="range" 
                          id="predict-experience-slider" 
                          className="form-range" 
                          min="0" 
                          max="15" 
                          step="1"
                          value={predictExp}
                          onChange={(e) => setPredictExp(parseInt(e.target.value))}
                        />
                        <span className="slider-val">{predictExp}y</span>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label className="toggle-label" id="predict-private-toggle-label">
                        <span style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>Private Institution</strong>
                          <span className="label-hint" style={{ textTransform: 'none', fontWeight: '400', fontSize: '0.75rem' }}>
                            Private vs. Public funding premium (+$50k)
                          </span>
                        </span>
                        <span className="toggle-switch">
                          <input 
                            type="checkbox" 
                            id="predict-private-toggle"
                            checked={predictPrivate} 
                            onChange={(e) => setPredictPrivate(e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </span>
                      </label>
                    </div>

                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label htmlFor="predict-state-select">
                        Institution Location (Cost of Living)
                        <span className="label-hint">MERIC Index: {COL_INDEX[predictState] || 100.0}</span>
                      </label>
                      <select 
                        id="predict-state-select" 
                        className="form-select" 
                        value={predictState} 
                        onChange={(e) => setPredictState(e.target.value)}
                        style={{ marginTop: '0.25rem' }}
                      >
                        {Object.keys(COL_INDEX).sort().map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="predict-enrollment-slider">
                        Estimated Student Enrollment
                        <span className="label-hint">{predictEnrollment.toLocaleString()} students</span>
                      </label>
                      <div className="slider-container">
                        <input 
                          type="range" 
                          id="predict-enrollment-slider" 
                          className="form-range" 
                          min="1000" 
                          max="50000" 
                          step="1000"
                          value={predictEnrollment}
                          onChange={(e) => setPredictEnrollment(parseInt(e.target.value))}
                        />
                        <span className="slider-val">{(predictEnrollment / 1000).toFixed(0)}k</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Right Column: Calculated Prediction Results */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h3 className="card-title">
                    <DollarIcon />
                    Salary Midpoint Prediction
                  </h3>
                  
                  <div className="regression-results-display">
                    <span className="stat-widget-label" style={{ color: 'var(--text-muted)' }}>Estimated Salary Midpoint</span>
                    <span className="regression-results-val">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prediction.predicted)}
                    </span>
                    <span className="regression-results-range">
                      Range: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prediction.minRange)} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prediction.maxRange)}
                    </span>
                    <span className="label-hint" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      Range calculated using model Mean Absolute Error (MAE) of {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prediction.mae)}
                    </span>
                  </div>

                  <div className={`disclaimer-card ${userComparison.status}`} style={{
                    backgroundColor: userComparison.status === 'positive' ? 'rgba(0, 143, 81, 0.08)' : userComparison.status === 'negative' ? 'rgba(255, 59, 48, 0.08)' : '#f2f2f7',
                    border: '1px solid var(--neutral-black)'
                  }}>
                    <InfoIcon />
                    <div>
                      <strong>Benchmark Comparison:</strong>
                      <p style={{ marginTop: '0.2rem', color: 'var(--text-body)' }}>{userComparison.text}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Benchmark Overlaid Horizontal Visualizer */}
              <div className="glass-card">
                <h3 className="card-title">
                  <BriefcaseIcon />
                  Benchmark Visual Comparison
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Overlays your benchmark salary ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userSalary)}) against the predicted salary midpoint range (Predicted ± MAE) on the local attorney pay scale:
                </p>

                <div className="regression-visual-wrapper">
                  <div className="regression-axis-line"></div>
                  
                  {/* Predicted Range Band */}
                  {(() => {
                    const minPct = Math.max(0, (prediction.minRange / 300000) * 100);
                    const maxPct = Math.min(100, (prediction.maxRange / 300000) * 100);
                    const widthPct = Math.max(1, maxPct - minPct);
                    
                    const predictedPct = Math.min(100, Math.max(0, (prediction.predicted / 300000) * 100));
                    const userPct = Math.min(100, Math.max(0, (userSalary / 300000) * 100));
                    
                    return (
                      <>
                        <div 
                          className="regression-band-range"
                          style={{ left: `${minPct}%`, width: `${widthPct}%` }}
                          title={`Confidence range: $${Math.round(prediction.minRange).toLocaleString()} - $${Math.round(prediction.maxRange).toLocaleString()}`}
                        />
                        <div 
                          className="regression-marker-predicted"
                          style={{ left: `${predictedPct}%` }}
                          title={`Predicted Midpoint: $${Math.round(prediction.predicted).toLocaleString()}`}
                        />
                        {userPct >= 0 && userPct <= 100 && (
                          <div 
                            className="regression-marker-user"
                            style={{ left: `${userPct}%` }}
                            title={`Your Salary: $${userSalary.toLocaleString()}`}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Legend & Axis Labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                  <div className="legend-item">
                    <span className="legend-color range" style={{ backgroundColor: 'rgba(0, 85, 255, 0.15)', border: '2px solid var(--accent)' }}></span>
                    <span>Predicted Market Range (± MAE)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ width: '6px', height: '14px', backgroundColor: 'var(--neutral-black)' }}></span>
                    <span>Predicted Midpoint ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prediction.predicted)})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary)' }}></span>
                    <span>Your Salary ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userSalary)})</span>
                  </div>
                </div>

                <div className="chart-axis-labels" style={{ marginTop: '0.5rem' }}>
                  <span>$0k</span>
                  <span>$75k</span>
                  <span>$150k</span>
                  <span>$225k</span>
                  <span>$300k</span>
                </div>
              </div>

              {/* Model Specifications & Table of Coefficients */}
              <div className="glass-card">
                <h3 className="card-title">
                  <ShieldCheckIcon />
                  OLS Regression Model Specifications
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Live coefficients computed by fitting the ordinary least squares (OLS) linear model to {modelData?.sample_size || 31} attorney job postings where starting salary, required experience, funding type, and student enrollment were available:
                </p>

                {/* Model Fit Stats Row */}
                <div className="regression-stats-grid">
                  <div className="stat-widget primary">
                    <span className="stat-widget-label">Sample Size (N)</span>
                    <span className="stat-widget-value" style={{ fontSize: '1.8rem' }}>{modelData?.sample_size || '31'}</span>
                    <span className="stat-widget-desc">JD job listings</span>
                  </div>
                  <div className="stat-widget success">
                    <span className="stat-widget-label">R-Squared (R²)</span>
                    <span className="stat-widget-value" style={{ fontSize: '1.8rem' }}>
                      {modelData?.r_squared ? modelData.r_squared.toFixed(4) : '0.7916'}
                    </span>
                    <span className="stat-widget-desc">Explains {modelData?.r_squared ? (modelData.r_squared * 100).toFixed(1) : '79.2'}% variance</span>
                  </div>
                  <div className="stat-widget accent">
                    <span className="stat-widget-label">Mean Absolute Error</span>
                    <span className="stat-widget-value" style={{ fontSize: '1.8rem' }}>
                      {modelData?.mae ? `$${Math.round(modelData.mae).toLocaleString()}` : '$22,337'}
                    </span>
                    <span className="stat-widget-desc">Average model delta</span>
                  </div>
                  <div className="stat-widget">
                    <span className="stat-widget-label">Residual DF</span>
                    <span className="stat-widget-value" style={{ fontSize: '1.8rem' }}>{modelData?.df_residual || '24'}</span>
                    <span className="stat-widget-desc">Degrees of freedom</span>
                  </div>
                </div>

                {/* Coefficients Table */}
                <div className="table-wrapper">
                  <table className="regression-table">
                    <thead>
                      <tr>
                        <th>Predictor Variable</th>
                        <th>Coefficient (Beta)</th>
                        <th>Standard Error</th>
                        <th>t-Statistic</th>
                        <th>p-Value</th>
                        <th>Significance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(modelData?.results || [
                        { feature: 'Intercept', coef: 13173.6139, std_err: 48834.2634, t_stat: 0.270, p_value: 7.8734e-1 },
                        { feature: 'min_years', coef: 11403.2161, std_err: 3748.1856, t_stat: 3.042, p_value: 2.3475e-3 },
                        { feature: 'is_private', coef: 50041.1320, std_err: 19557.4552, t_stat: 2.559, p_value: 1.0507e-2 },
                        { feature: 'col_index', coef: 445.3013, std_err: 442.6159, t_stat: 1.006, p_value: 3.1438e-1 },
                        { feature: 'estimated_enrollment', coef: 1.4874, std_err: 0.5717, t_stat: 2.602, p_value: 9.2792e-3 },
                        { feature: 'General Counsel', coef: 63428.6186, std_err: 38356.6657, t_stat: 1.654, p_value: 9.8198e-2 },
                        { feature: 'Deputy General Counsel', coef: 31841.0224, std_err: 48826.2380, t_stat: 0.652, p_value: 5.1432e-1 },
                        { feature: 'Associate General Counsel', coef: -6419.7070, std_err: 20721.9820, t_stat: -0.310, p_value: 7.5671e-1 }
                      ]).map(row => {
                        const p = row.p_value;
                        let sig = 'ns';
                        if (p < 0.001) sig = '***';
                        else if (p < 0.01) sig = '**';
                        else if (p < 0.05) sig = '*';
                        else if (p < 0.1) sig = '.';

                        return (
                          <tr key={row.feature}>
                            <td style={{ fontWeight: '700' }}>
                              {row.feature === 'min_years' ? 'Required Experience (per year)' : 
                               row.feature === 'is_private' ? 'Private Institution (vs Public)' : 
                               row.feature === 'col_index' ? 'Cost of Living Index (per point)' : 
                               row.feature === 'estimated_enrollment' ? 'Estimated Enrollment (per student)' : 
                               row.feature}
                            </td>
                            <td style={{ color: row.coef < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '600' }}>
                              {row.coef < 0 ? '-' : '+'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Math.abs(row.coef))}
                            </td>
                            <td>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(row.std_err)}</td>
                            <td>{row.t_stat.toFixed(3)}</td>
                            <td>{row.p_value.toExponential(3)}</td>
                            <td style={{ fontWeight: '700', color: sig !== 'ns' ? 'var(--accent)' : 'var(--text-dimmed)' }}>{sig}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="significance-legend">
                  Significance codes: <strong>***</strong> p &lt; 0.001 (Extremely Significant); <strong>**</strong> p &lt; 0.01 (Highly Significant); <strong>*</strong> p &lt; 0.05 (Significant); <strong>.</strong> p &lt; 0.1 (Marginally Significant); <strong>ns</strong> p &ge; 0.1 (Not Statistically Significant)
                </div>

              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
