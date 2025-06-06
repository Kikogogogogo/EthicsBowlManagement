import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Scoreboard from './pages/Scoreboard';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import GoogleSheetsService from './services/GoogleSheetsService';
import AuthService from './services/AuthService';
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app load
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Small delay to ensure Google API has time to load
      setTimeout(() => {
        const signedIn = GoogleSheetsService.isSignedIn();
        setIsAuthenticated(signedIn);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (userData) => {
    try {
      setIsAuthenticated(true);
      // 获取 access token
      const accessToken = await GoogleSheetsService.getAccessToken();
      // 使用 access token 初始化用户
      const userInfo = await AuthService.initializeUser(userData, accessToken);
      setUserRole(userInfo.role);
      setUserInfo(userInfo.user);
    } catch (error) {
      console.error('Failed to initialize user:', error);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
    }
  };

  function RoleRedirect() {
    if (!isAuthenticated) return <Navigate to="/" replace />;
    if (userRole === 'event_admin') return <Navigate to="/admin" replace />;
    if (userRole === 'judge') return <Navigate to="/scoreboard" replace />;
    return null;
  }

  // 受保护的路由组件
  function ProtectedRoute({ element: Element, allowedRole }) {
    if (!isAuthenticated) return <Navigate to="/" replace />;
    if (allowedRole && userRole !== allowedRole) return <Navigate to="/" replace />;
    return Element;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Ethics Bowl Scoring System...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="container mx-auto px-4 py-8">
            {!isAuthenticated ? (
              <div>
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Ethics Bowl Judging Scoreboard
                  </h1>
                  <p className="text-xl text-gray-600">
                    Professional Scoring System for Ethics Bowl Competitions
                  </p>
                </div>
                <Login onLoginSuccess={handleLoginSuccess} />
              </div>
            ) : (
              <div>
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome, {userInfo?.name || userInfo?.email}
                  </h2>
                  <p className="text-gray-600">
                    Role: {userRole === 'event_admin' ? 'Event Admin' : 'Judge'}
                  </p>
                </div>
                <Routes>
                  <Route path="/" element={<RoleRedirect />} />
                  <Route path="/admin" element={<ProtectedRoute element={<AdminPanel />} allowedRole="event_admin" />} />
                  <Route path="/scoreboard" element={<ProtectedRoute element={<Scoreboard />} allowedRole="judge" />} />
                </Routes>
              </div>
            )}
          </main>
          
          {/* Footer */}
          <footer className="bg-white border-t mt-12">
            <div className="container mx-auto px-4 py-6">
              <div className="text-center text-gray-600">
                <p>&copy; 2025 Ethics Bowl Scoreboard. Professional scoring system with Google Sheets integration.</p>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App; 