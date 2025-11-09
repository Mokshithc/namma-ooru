import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';
import AdminReportsMap from './AdminReportsMap';  // NEW IMPORT
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
// const { user } = useAuth();
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, reportsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/reports')
      ]);

      setStats(statsRes.data);
      setReports(reportsRes.data.reports);
      setFilteredReports(reportsRes.data.reports);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };



const handleAdminClick = () => {
  
  navigate('/dashboard');
};

const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStatClick = (filterStatus) => {
    setActiveFilter(filterStatus);
    
    if (!filterStatus) {
      setFilteredReports(reports);
    } else {
      const filtered = reports.filter(report => report.status === filterStatus);
      setFilteredReports(filtered);
    }
  };

  const handleReportClick = (id) => {
    navigate(`/admin/reports/${id}`);
  };

  if (loading) {
    return <div className="admin-dashboard"><p>Loading...</p></div>;
  }

  return (


    


    <div className="admin-dashboard">

<div className="header-content">
        <button onClick={handleAdminClick} className="action-btn secondary">
          User Dashboard
        </button>
        <h1> Namma Ooru</h1>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        
      </div>
      
      <h1>Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div 
          className={`stat-card ${activeFilter === '' ? 'active' : ''}`}
          onClick={() => handleStatClick('')}
        >
          <h3>Total Reports</h3>
          <p className="stat-number">{stats.total}</p>
        </div>

        <div 
          className={`stat-card ${activeFilter === 'open' ? 'active' : ''}`}
          onClick={() => handleStatClick('open')}
        >
          <h3>Open</h3>
          <p className="stat-number">{stats.open}</p>
        </div>

        <div 
          className={`stat-card ${activeFilter === 'in_progress' ? 'active' : ''}`}
          onClick={() => handleStatClick('in_progress')}
        >
          <h3>In Progress</h3>
          <p className="stat-number">{stats.in_progress}</p>
        </div>

        {/* NEW: Awaiting Confirmation */}
        <div 
          className={`stat-card awaiting ${activeFilter === 'awaiting_user_confirmation' ? 'active' : ''}`}
          onClick={() => handleStatClick('awaiting_user_confirmation')}
        >
          <h3>⏳ Awaiting Confirmation</h3>
          <p className="stat-number">{stats.awaiting_confirmation || 0}</p>
        </div>

        {/* NEW: Reopened */}
        <div 
          className={`stat-card reopened ${activeFilter === 'reopened' ? 'active' : ''}`}
          onClick={() => handleStatClick('reopened')}
        >
          <h3>🔄 Reopened</h3>
          <p className="stat-number">{stats.reopened || 0}</p>
        </div>

        {/* <div 
          className={`stat-card ${activeFilter === 'resolved' ? 'active' : ''}`}
          onClick={() => handleStatClick('resolved')}
        >
          <h3>Resolved</h3>
          <p className="stat-number">{stats.resolved || 0}</p>
        </div> */}

        {/* NEW: Closed */}
        <div 
          className={`stat-card closed ${activeFilter === 'closed' ? 'active' : ''}`}
          onClick={() => handleStatClick('closed')}
        >
          <h3>✓ Closed</h3>
          <p className="stat-number">{stats.closed || 0}</p>
        </div>
      </div>







      {/* Reports List */}
     <div className="reports-section">

       <AdminReportsMap reports={filteredReports} statusFilter={activeFilter} />

  <h2>
    Reports
  </h2>

  {filteredReports.length === 0 ? (
    <div className="no-reports">No reports found for this filter.</div>
  ) : (
    <div className="table-container">
      <table className="reports-table">
        <thead>
          <tr>
            <th>Report ID</th>
            <th>user</th>
            <th>Category</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredReports.map((report, index) => (
            <tr 
              key={report.id || `temp-${index}`}
              onClick={() => {
                if (report.id) {
                  handleReportClick(report.id);
                }
              }}
              className="table-row"
              style={{ cursor: report.id ? 'pointer' : 'not-allowed' }}
            >
              <td className="report-id">
                {report.id ? `#${report.id}` : '#N/A'}
              </td>
              <td>
                <span className='report=._id'>
                  {report.user_name}
                </span>
              </td>
              <td className="category">
                {report.category || 'N/A'}
              </td>
              <td className="description">
                {report.description 
                  ? `${report.description.substring(0, 60)}${report.description.length > 60 ? '...' : ''}`
                  : 'No description'
                }
              </td>
              <td>
                <span className={`priority-badge priority-${report.priority || 'null'}`}>
                  {report.priority || 'null'}
                  {report.reopen_count > 0 && ` (Re-raised ${report.reopen_count}x)`}
                </span>
              </td>
              <td className="date">
                {report.created_at 
                  ? new Date(report.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                  : 'N/A'
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

    </div>
  );
};

export default AdminDashboard;
