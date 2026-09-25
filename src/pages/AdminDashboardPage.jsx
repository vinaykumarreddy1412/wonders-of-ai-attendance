import { 
  getAllStudents, 
  getAllSessions, 
  getAllVolunteers,
  getAllAttendanceRecords,
  updateVolunteer,
  getAttendanceStats, 
  createSession, 
  updateSessionStatus, 
  deleteSession,
  adminSetStudentAttendance, 
  exportAttendanceExcel,
  exportSessionAttendanceExcel,
  importCustomExcelFile,
  initializeDB,
  subscribeToDB
} from '../services/db';
import { formatDate, formatTimeAMPM, evaluateSessionStatus } from '../utils/timeUtils';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  QrCode, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  RotateCcw,
  Eye,
  Check,
  X,
  AlertTriangle,
  Upload,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Phone,
  Hash,
  KeyRound,
  Radio,
  UserCheck,
  Edit3,
  Percent,
  FileSpreadsheet
} from 'lucide-react';

export function AdminDashboardPage({ onNavigate }) {
  const { admin } = useAuth();

  // Data states initialized with live data
  const [students, setStudents] = useState(() => getAllStudents() || []);
  const [sessions, setSessions] = useState(() => getAllSessions() || []);
  const [attendanceRecords, setAttendanceRecords] = useState(() => getAllAttendanceRecords() || []);
  const [volunteers, setVolunteers] = useState(() => getAllVolunteers() || []);
  const [selectedSessionId, setSelectedSessionId] = useState('ALL');
  const [stats, setStats] = useState(() => getAttendanceStats() || { totalDelegates: 0, present: 0, absent: 0, notMarked: 0, attendancePercentage: 0 });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PRESENT, ABSENT, NOT MARKED
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Session Creation Form states
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('Euphoria 2026 - Main Session');
  const [newSessionDate, setNewSessionDate] = useState(formatDate(new Date()));
  const [newSessionStartTime, setNewSessionStartTime] = useState('09:00 AM');
  const [newSessionEndTime, setNewSessionEndTime] = useState('11:00 AM');
  const [createError, setCreateError] = useState('');

  // Modals
  const [selectedStudentModal, setSelectedStudentModal] = useState(null);
  const [confirmAttendanceChange, setConfirmAttendanceChange] = useState(null); // { student, newStatus }
  const [editingVolunteerModal, setEditingVolunteerModal] = useState(null); // { id, name, username, passCode }

  // Load and subscribe to DB
  useEffect(() => {
    if (!admin) {
      onNavigate('/admin/login');
      return;
    }

    const refreshData = () => {
      const allStu = getAllStudents() || [];
      const allSess = getAllSessions() || [];
      const allRecs = getAllAttendanceRecords() || [];
      const allVols = getAllVolunteers() || [];
      setStudents(allStu);
      setSessions(allSess);
      setAttendanceRecords(allRecs);
      setVolunteers(allVols);
      setStats(getAttendanceStats(selectedSessionId));
    };

    refreshData();
    const unsubscribe = subscribeToDB(() => refreshData());
    return unsubscribe;
  }, [admin, selectedSessionId, onNavigate]);

  useEffect(() => {
    setStats(getAttendanceStats(selectedSessionId));
  }, [selectedSessionId, students, attendanceRecords]);

  if (!admin) return null;

  // Handle Create Session
  const handleCreateSessionSubmit = (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newSessionName.trim()) {
      setCreateError('Please enter a session name.');
      return;
    }
    if (!newSessionDate.trim()) {
      setCreateError('Please enter a valid session date.');
      return;
    }
    if (!newSessionStartTime.trim() || !newSessionEndTime.trim()) {
      setCreateError('Please specify start and end times in AM/PM format (e.g. 09:00 AM).');
      return;
    }

    const created = createSession({
      sessionName: newSessionName,
      date: newSessionDate,
      startTime: newSessionStartTime,
      endTime: newSessionEndTime
    });

    setIsCreatingSession(false);
    if (created && created.sessionId) {
      setSelectedSessionId(created.sessionId);
    }
  };

  // Handle Attendance Change Confirmation
  const executeAttendanceChange = () => {
    if (!confirmAttendanceChange) return;
    const { student, newStatus } = confirmAttendanceChange;

    adminSetStudentAttendance({
      registrationCode: student.registrationCode,
      newStatus,
      sessionId: selectedSessionId !== 'ALL' ? selectedSessionId : null,
      adminName: 'Admin'
    });

    setConfirmAttendanceChange(null);
  };

  // Handle Volunteer Credential Update
  const handleSaveVolunteer = (e) => {
    e.preventDefault();
    if (!editingVolunteerModal) return;

    updateVolunteer(editingVolunteerModal.id, {
      name: editingVolunteerModal.name,
      username: editingVolunteerModal.username,
      passCode: editingVolunteerModal.passCode
    });

    setEditingVolunteerModal(null);
  };

  // Handle Excel Import from file input
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await importCustomExcelFile(file);
      alert(`Successfully imported ${res.count} student delegates!`);
    } catch (err) {
      alert(`Import error: ${err.message}`);
    }
    e.target.value = '';
  };

  // Reset database back to original Euphoria 2026 dataset
  const handleResetToDefault = () => {
    if (window.confirm('Are you sure you want to reset all attendance records back to initial Excel state?')) {
      initializeDB(true);
    }
  };

  // Session-specific records map
  const sessionRecordMap = useMemo(() => {
    const map = new Map();
    if (selectedSessionId && selectedSessionId !== 'ALL') {
      (attendanceRecords || [])
        .filter(r => r && r.sessionId === selectedSessionId)
        .forEach(r => {
          if (r.registrationCode) {
            map.set(r.registrationCode.trim().toLowerCase(), r);
          }
        });
    }
    return map;
  }, [attendanceRecords, selectedSessionId]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const isSessionFiltered = selectedSessionId !== 'ALL';
    const rawList = Array.isArray(students) ? students : [];

    return rawList.map(s => {
      if (!s) return s;
      if (isSessionFiltered) {
        const regKey = String(s.registrationCode || '').trim().toLowerCase();
        const rec = sessionRecordMap.get(regKey);
        return {
          ...s,
          attendance: rec ? rec.status : 'NOT MARKED',
          attendanceDate: rec ? rec.date : '-',
          attendanceTime: rec ? rec.time : '-',
          scannedBy: rec ? (rec.scannedBy || '-') : '-'
        };
      }
      return s;
    }).filter(s => {
      if (!s) return false;
      const studentStatus = String(s.attendance || 'NOT MARKED').toUpperCase();
      if (statusFilter !== 'ALL' && studentStatus !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const reg = String(s.registrationCode || '').toLowerCase();
      const name = String(s.delegateFullName || '').toLowerCase();
      const mobile = String(s.mobileNumber || '').toLowerCase();
      const col = String(s.college || '').toLowerCase();
      const pass = String(s.passCode || '').toLowerCase();
      const scannedBy = String(s.scannedBy || '').toLowerCase();

      return reg.includes(query) || name.includes(query) || mobile.includes(query) || col.includes(query) || pass.includes(query) || scannedBy.includes(query);
    });
  }, [students, searchQuery, statusFilter, selectedSessionId, sessionRecordMap]);

  // Pagination calculation
  const totalPages = Math.ceil((filteredStudents?.length || 0) / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (filteredStudents || []).slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  return (
    <div className="page-wrapper">
      
      {/* Top Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <ShieldCheck size={14} color="#2563eb" />
            <span>Admin Control Center</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Euphoria 2026 Admin Dashboard
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => exportAttendanceExcel(selectedSessionId)}
            title="Download full attendance report with volunteer scan info as .xlsx"
          >
            <Download size={16} />
            <span>{selectedSessionId === 'ALL' ? 'Export Overall Excel' : 'Export Session Excel'}</span>
          </button>

          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
            <Upload size={16} />
            <span>Import Excel</span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </label>

          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleResetToDefault}
            title="Reset to original imported Excel dataset"
          >
            <RotateCcw size={15} />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-total">
          <div className="stat-label">TOTAL PARTICIPANTS</div>
          <div className="stat-value">{stats.totalDelegates}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Imported from Excel</span>
        </div>

        <div className="stat-card stat-card-present">
          <div className="stat-label">PRESENT</div>
          <div className="stat-value" style={{ color: 'var(--present-text)' }}>{stats.present}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--present-text)', marginTop: '0.25rem' }}>
            {stats.attendancePercentage}% verified check-ins
          </span>
        </div>

        <div className="stat-card stat-card-notmarked">
          <div className="stat-label">NOT MARKED</div>
          <div className="stat-value" style={{ color: 'var(--notmarked-text)' }}>{stats.notMarked}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--notmarked-text)', marginTop: '0.25rem' }}>Pending volunteer scan</span>
        </div>

        <div className="stat-card stat-card-total" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="stat-label">ATTENDANCE RATE</div>
          <div className="stat-value" style={{ color: '#6d28d9' }}>{stats.attendancePercentage}%</div>
          <span style={{ fontSize: '0.75rem', color: '#6d28d9', marginTop: '0.25rem' }}>Real-time percentage</span>
        </div>
      </div>

      {/* Section 1: Volunteer Management (Max 5 Slots) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <UserCheck size={20} color="#059669" />
              <span>Volunteer Desk Accounts (5 Max)</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Volunteers scan participant QR codes using their mobile cameras. Manage their login credentials below.
            </p>
          </div>

          <span className="badge badge-present">
            5 / 5 Slots Assigned
          </span>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Volunteer Name</th>
                <th>Username / Login ID</th>
                <th>Pass Code</th>
                <th>Role Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((vol) => (
                <tr key={vol.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserCheck size={14} color="#059669" />
                      <span>{vol.name}</span>
                    </div>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.825rem', fontWeight: 600 }}>
                      {vol.username}
                    </code>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.825rem', color: '#0f172a' }}>
                      {vol.passCode}
                    </code>
                  </td>
                  <td>
                    <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>
                      Active Scanner
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingVolunteerModal(vol)}
                    >
                      <Edit3 size={13} />
                      <span>Edit Credentials</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Attendance Sessions & QR Code Creation */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <QrCode size={20} color="#2563eb" />
              <span>Attendance Sessions & Event Info</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Create session windows and view session schedules.
            </p>
          </div>

          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => setIsCreatingSession(!isCreatingSession)}
          >
            {isCreatingSession ? <X size={15} /> : <Plus size={15} />}
            <span>{isCreatingSession ? 'Cancel' : 'Create Attendance Session'}</span>
          </button>
        </div>

        {/* Create Session Form */}
        {isCreatingSession && (
          <form 
            onSubmit={handleCreateSessionSubmit} 
            style={{ 
              background: '#f8fafc', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary-700)' }}>
              New Session Details
            </h3>

            {createError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {createError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="form-label">Session Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Euphoria 2026 - Day 1"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Date (DD/MM/YYYY)</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="25/09/2026"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Start Time (AM/PM)</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="09:00 AM"
                  value={newSessionStartTime}
                  onChange={(e) => setNewSessionStartTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">End Time (AM/PM)</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="11:00 AM"
                  value={newSessionEndTime}
                  onChange={(e) => setNewSessionEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setIsCreatingSession(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-sm"
              >
                <QrCode size={14} />
                <span>Save Session</span>
              </button>
            </div>
          </form>
        )}

        {/* Sessions Table */}
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            No sessions created yet. Click "Create Attendance Session" to start.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Date</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((sess) => {
                  const evalStatus = evaluateSessionStatus(sess);
                  return (
                    <tr key={sess.sessionId}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {sess.sessionName}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} color="#64748b" />
                          <span>{sess.date}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{sess.startTime}</td>
                      <td style={{ fontSize: '0.85rem' }}>{sess.endTime}</td>
                      <td>
                        <span className={`badge ${evalStatus.status === 'ACTIVE' ? 'badge-present' : evalStatus.status === 'UPCOMING' ? 'badge-upcoming' : 'badge-closed'}`}>
                          <Radio size={10} className={evalStatus.status === 'ACTIVE' ? 'pulse-anim' : ''} />
                          <span>{evalStatus.status}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => exportSessionAttendanceExcel(sess.sessionId)}
                            title={`Download individual Excel report for ${sess.sessionName}`}
                            style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
                          >
                            <Download size={13} color="#2563eb" />
                            <span>Export Excel</span>
                          </button>

                          {sess.status === 'Closed' ? (
                            <button 
                              type="button" 
                              className="btn btn-success btn-sm"
                              onClick={() => updateSessionStatus(sess.sessionId, 'Active')}
                              title="Open / Reopen this attendance session anytime"
                            >
                              <CheckCircle2 size={13} />
                              <span>Open / Reopen</span>
                            </button>
                          ) : (
                            <button 
                              type="button" 
                              className="btn btn-secondary btn-sm"
                              onClick={() => updateSessionStatus(sess.sessionId, 'Closed')}
                              title="Close this attendance session"
                            >
                              <XCircle size={13} color="#dc2626" />
                              <span>Close Session</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => {
                              if (window.confirm(`Delete session "${sess.sessionName}"?`)) {
                                deleteSession(sess.sessionId);
                              }
                            }}
                            title="Delete Session"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Student Database & Live Attendance Table */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">
              <Users size={20} color="#2563eb" />
              <span>Delegates Attendance Table</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {selectedSessionId === 'ALL' 
                ? 'Showing overall attendance status across all events.'
                : `Viewing attendance specifically for ${sessions.find(s => s.sessionId === selectedSessionId)?.sessionName || 'Selected Session'}.`
              }
            </p>
          </div>

          <span className="badge badge-active">
            Showing {filteredStudents.length} of {students.length}
          </span>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Session Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 auto' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileSpreadsheet size={15} color="#2563eb" />
                <span>Session:</span>
              </span>
              <select
                className="form-control"
                style={{ fontSize: '0.875rem', padding: '0.45rem 0.85rem', minWidth: '220px', fontWeight: 600, borderColor: '#93c5fd' }}
                value={selectedSessionId}
                onChange={(e) => {
                  setSelectedSessionId(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Sessions (Overall)</option>
                {sessions.map(s => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.sessionName} ({s.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Search by Reg Code, Name, Mobile, College, Volunteer..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['ALL', 'PRESENT', 'ABSENT', 'NOT MARKED'].map((filterVal) => (
                <button
                  key={filterVal}
                  type="button"
                  className={`btn btn-sm ${statusFilter === filterVal ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setStatusFilter(filterVal);
                    setCurrentPage(1);
                  }}
                  style={{ textTransform: 'capitalize' }}
                >
                  {filterVal === 'ALL' ? 'All' : filterVal}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Students Table with Scanned By Column */}
        {filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Search size={36} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
            <p style={{ fontWeight: 600 }}>No matching delegates found</p>
            <p style={{ fontSize: '0.825rem' }}>Try refining your search query or reset status filter.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Registration Code</th>
                    <th>Name</th>
                    <th>College</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Scanned By</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((stu) => {
                    const status = (stu.attendance || 'NOT MARKED').toUpperCase();
                    return (
                      <tr key={stu.id || stu.registrationCode}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          {stu.registrationCode}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {stu.delegateFullName}
                        </td>
                        <td style={{ fontSize: '0.85rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stu.college}>
                          {stu.college || 'Euphoria Participant'}
                        </td>
                        <td>
                          <span className={`badge ${status === 'PRESENT' ? 'badge-present' : status === 'ABSENT' ? 'badge-absent' : 'badge-notmarked'}`}>
                            {status === 'PRESENT' ? <CheckCircle2 size={12} /> : status === 'ABSENT' ? <XCircle size={12} /> : <Clock size={12} />}
                            <span>{status}</span>
                          </span>
                        </td>
                        <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                          {stu.attendanceDate || '-'}
                        </td>
                        <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                          {stu.attendanceTime || '-'}
                        </td>
                        <td style={{ fontSize: '0.825rem' }}>
                          {stu.scannedBy ? (
                            <span className="badge badge-active" style={{ fontSize: '0.725rem' }}>
                              <UserCheck size={11} />
                              <span>{stu.scannedBy}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedStudentModal(stu)}
                              title="View details"
                            >
                              <Eye size={13} />
                            </button>

                            {status !== 'PRESENT' ? (
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => setConfirmAttendanceChange({ student: stu, newStatus: 'PRESENT' })}
                                title="Mark Present"
                              >
                                <Check size={13} />
                                <span>Present</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => setConfirmAttendanceChange({ student: stu, newStatus: 'ABSENT' })}
                                title="Mark Absent"
                              >
                                <X size={13} />
                                <span>Absent</span>
                              </button>
                            )}

                            {status !== 'NOT MARKED' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setConfirmAttendanceChange({ student: stu, newStatus: 'NOT MARKED' })}
                                title="Reset to Not Marked"
                              >
                                <span>Reset</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Page {currentPage} of {totalPages} ({filteredStudents.length} total results)
                </span>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Volunteer Credentials Modal */}
      {editingVolunteerModal && (
        <div className="modal-overlay" onClick={() => setEditingVolunteerModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Volunteer Credentials</h3>
              <button className="modal-close-btn" onClick={() => setEditingVolunteerModal(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVolunteer}>
              <div className="form-group">
                <label className="form-label">Volunteer Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingVolunteerModal.name}
                  onChange={(e) => setEditingVolunteerModal({ ...editingVolunteerModal, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username / Login ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingVolunteerModal.username}
                  onChange={(e) => setEditingVolunteerModal({ ...editingVolunteerModal, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Pass Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingVolunteerModal.passCode}
                  onChange={(e) => setEditingVolunteerModal({ ...editingVolunteerModal, passCode: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingVolunteerModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Details Modal */}
      {selectedStudentModal && (
        <div className="modal-overlay" onClick={() => setSelectedStudentModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Delegate Information</h3>
              <button className="modal-close-btn" onClick={() => setSelectedStudentModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                <span style={{ fontWeight: 700 }}>{selectedStudentModal.delegateFullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Registration Code:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{selectedStudentModal.registrationCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pass Code:</span>
                <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{selectedStudentModal.passCode}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>College / Institution:</span>
                <span style={{ fontWeight: 600 }}>{selectedStudentModal.college}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mobile Number:</span>
                <span>{selectedStudentModal.mobileNumber || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Scanned By:</span>
                <span style={{ fontWeight: 600, color: '#047857' }}>{selectedStudentModal.scannedBy || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
                <span className={`badge ${selectedStudentModal.attendance === 'PRESENT' ? 'badge-present' : selectedStudentModal.attendance === 'ABSENT' ? 'badge-absent' : 'badge-notmarked'}`}>
                  {selectedStudentModal.attendance || 'NOT MARKED'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-block"
                onClick={() => setSelectedStudentModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Attendance Status Change Modal */}
      {confirmAttendanceChange && (
        <div className="modal-overlay" onClick={() => setConfirmAttendanceChange(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div 
              style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '50%', 
                background: '#fef3c7', 
                color: '#d97706',
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '1rem'
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Confirm Attendance Update
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to change the attendance for <strong>{confirmAttendanceChange.student.delegateFullName}</strong> ({confirmAttendanceChange.student.registrationCode}) to:
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <span className={`badge ${confirmAttendanceChange.newStatus === 'PRESENT' ? 'badge-present' : confirmAttendanceChange.newStatus === 'ABSENT' ? 'badge-absent' : 'badge-notmarked'}`} style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
                {confirmAttendanceChange.newStatus}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmAttendanceChange(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={executeAttendanceChange}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
