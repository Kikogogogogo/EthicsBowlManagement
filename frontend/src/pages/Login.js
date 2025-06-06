import React, { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import GoogleSheetsService from '../services/GoogleSheetsService';
import AuthService from '../services/AuthService';

const Login = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Use useGoogleLogin to get access_token
  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    onSuccess: async tokenResponse => {
      try {
        setIsLoading(true);
        setError('');
        const accessToken = tokenResponse.access_token;
        console.log('✅ Got access token:', accessToken);

        // Store in GoogleSheetsService
        GoogleSheetsService.setAccessToken(accessToken);

        // Get user profile information
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        
        if (!userResponse.ok) {
          throw new Error('Failed to get user information');
        }
        
        const userData = await userResponse.json();
        console.log('✅ Got user data:', userData);

        // Initialize AuthService with user data (this will check authorization)
        try {
          console.log('🔍 Initializing user with AuthService:', userData.email);
          await AuthService.initializeUser(userData, accessToken);
          console.log('✅ User initialized and authorized successfully');
        } catch (authError) {
          console.error('❌ Authorization failed:', authError);
          throw authError;
        }
        
        setIsSignedIn(true);
        onLoginSuccess && onLoginSuccess(userData);
      } catch (err) {
        console.error('❌ Failed to access Sheets or get user info:', err);
        setError('Access failed: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    },
    onError: err => {
      console.error('Login Failed:', err);
      setError('Login failed');
    }
  });

  const handleSignOut = () => {
    GoogleSheetsService.accessToken = null;
    setIsSignedIn(false);
  };

  if (isSignedIn) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Successfully Logged In</h3>
          <p className="text-sm text-gray-600 mb-4">You can now use the scoring system</p>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ethics Bowl Scoring System
          </h2>
          <p className="text-gray-600 mb-6">
            Please login with your authorized Google account to access the system
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
              Signing in with Google...
            </div>
          )}
          <button
            onClick={() => login()}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
          <div className="mt-4 text-xs text-gray-500">
            <p>Only authorized users can access the system. Contact your administrator if you need access.</p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;