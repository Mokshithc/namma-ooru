import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Dashboard.css';
//const [showAdminAlert, setShowAdminAlert] = useState(false);



const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, resolved
  const [error, setError] = useState('');
  const { user } = useAuth();
  

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
  try {
    setLoading(true);
    
    // Fetch user reports
    const reportsResponse = await api.get('/reports/my-reports');
    const userReports = reportsResponse.data.reports;
    setReports(userReports);
    
    // Calculate stats from reports
    const calculatedStats = {
      total: userReports.length,
      open: userReports.filter(r => r.status === 'open').length,
      in_progress: userReports.filter(r => r.status === 'in_progress').length,
      resolved: userReports.filter(r => r.status === 'resolved').length,
      closed: userReports.filter(r => r.status === 'closed').length,
      reopened: userReports.filter(r => r.status === 'reopened').length
    };
    setStats(calculatedStats);
    
    setLoading(false);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    setError('Failed to load dashboard');
    setLoading(false);
  }
};


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#ff9800';
      case 'in_progress': return '#2196F3';
      case 'resolved': return '#4CAF50';
      default: return '#757575';
    }
  };

const handleAdminClick = () => {
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) return alert('Access restricted: Admins only');
  navigate('/admin');
};

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return ' ';
      case 'in_progress': return ' ';
      case 'resolved': return ' ';
      default: return ' ';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }



  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">{error}</div>
      </div>
    );
  }



 return (
  <div className="dashboard-container">
    <header className="dashboard-header">
      <div className="header-content">
        <button onClick={handleAdminClick} className="action-btn secondary">
          Admin Dashboard
        </button>
        <h1> Namma Ooru</h1>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        
      </div>
      
    </header>  
        <div className="stats-grid">
  <div 
    className={`stat-card ${filter === 'all' ? 'active' : ''}`} 
    onClick={() => setFilter('all')}
  >
    <div className="stat-content">
      <h3>{stats?.total || 0}</h3>
      <p>Total Reports</p>
    </div>
  </div>
          <div className={`stat-card ${filter === 'open' ? 'active' : ''}`}  onClick={() => setFilter('open')}>
         
            <div className="stat-content">
              <h3>{stats?.open || 0}</h3>
              <p>Open</p>
            </div>
          </div>
          <div className={`stat-card ${filter === 'in_progress' ? 'active' : ''}`}  onClick={() => setFilter('in_progress')}>
            <div className="stat-content">
              <h3>{stats?.in_progress || 0}</h3>
              <p>In Progress</p>
            </div>
          </div>
          <div className={`stat-card ${filter === 'resolved' ? 'active' : ''}`}  onClick={() => setFilter('resolved')}>
            <div className="stat-content">
              <h3>{stats?.resolved || 0}</h3>
              <p>Resolved</p>
            </div>
          </div>

    <div className={`stat-card ${filter === 'closed' ? 'active' : ''}`}  onClick={() => setFilter('closed')}>
            <div className="stat-content">
              <h3>{stats?.closed || 0}</h3>
              <p>Closed</p>
            </div>
          </div>



 <div className={`stat-card ${filter === 'reopened' ? 'active' : ''}`}  onClick={() => setFilter('reopened')}>
            <div className="stat-content">
              <h3>{stats?.reopened || 0}</h3>
              <p>Reopened</p>
            </div>
          </div>


        </div>
        {<div className="actions-bar">
          <button onClick={() => navigate('/create-report')} className="btn-create">
            + Create New Report
          </button>
        </div> }
        <div className="reports-section">
          <h2>Your Reports</h2>
          {filteredReports.length === 0 ? (
            <div className="empty-state"><p>📭 No reports found.</p></div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => (
                <div key={report.id} className="report-card" onClick={() => navigate(`/report/${report.id}`)}>
                  <div className="report-image">
                    {report.image_url ? (
                      <img src={`${process.env.REACT_APP_BASE_URL}${report.image_url}`} alt={report.category} />
                    ) : (
                      <div className="no-image">📷</div>
                    )}
                    <span className="status-badge-dash" style={{ backgroundColor: getStatusColor(report.status) }}>
                      {getStatusIcon(report.status)} {report.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="report-content">
                    <h3>{report.category.replace('_', ' ')}</h3>
                    <p className="report-description">
                      {report.description?.substring(0, 100)}{report.description?.length > 100 ? '...' : ''}
                    </p>
                    <div className="report-meta">
                      <span className="meta-item">📍 {report.address || 'Location not provided'}</span>
                      <span className="meta-item">📅 {new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    
    
  </div>
);
};


export default Dashboard;