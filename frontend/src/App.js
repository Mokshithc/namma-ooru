import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import CreateReport from './components/Report/CreateReport';
import ReportDetail from './components/ReportDetail/ReportDetail';
import AdminDashboard from './components/Admin/AdminDashboard';
//import AllReports from './components/Admin/AllReports';
import AdminReportDetail from './components/Admin/AdminReportDetail';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Loading...</p>
      </div>
    );
  }


  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen"><p>Loading...</p></div>;
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};


// Admin Route Component
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
}

// Main App
function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app">
      <main className="app-main">
        <Routes>
          {/* Root - redirect based on auth */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Public routes */}
       <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
<Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />


          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/report/:id"
            element={
              <ProtectedRoute>
                <ReportDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-report"
            element={
              <ProtectedRoute>
                <CreateReport />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />         
          <Route
            path="/admin/reports/:id"
            element={
              <AdminRoute>
                <AdminReportDetail />
              </AdminRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// Wrap with providers
function AppWithProviders() {
  return (
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  );
}

export default AppWithProviders;
