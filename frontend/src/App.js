import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Scoreboard from './components/Scoreboard';
import Login from './components/Login';
import GoogleSheetsService from './services/GoogleSheetsService';
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

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
              <Routes>
                <Route path="/" element={<Scoreboard />} />
                <Route path="/scoreboard" element={<Scoreboard />} />
              </Routes>
            )}
          </main>
          
          {/* Footer */}
          <footer className="bg-white border-t mt-12">
            <div className="container mx-auto px-4 py-6">
              <div className="text-center text-gray-600">
                <p>&copy; 2024 Ethics Bowl Scoreboard. Professional scoring system with Google Sheets integration.</p>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App; 