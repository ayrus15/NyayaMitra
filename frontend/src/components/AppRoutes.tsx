import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';
import { RootState, AppDispatch } from '../store/store';
import { getCurrentUserAsync } from '../store/slices/authSlice';

// Components
import Navbar from './Navbar';
import ProtectedRoute from './ProtectedRoute';
import LoadingScreen from './LoadingScreen';

// Pages
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import CasesPage from '../pages/CasesPage';
import SosPage from '../pages/SosPage';
import ChatPage from '../pages/ChatPage';
import ReportsPage from '../pages/ReportsPage';
import ProfilePage from '../pages/ProfilePage';

const AppRoutes: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // If we have a token but no user, try to get current user
    if (token && !isAuthenticated) {
      dispatch(getCurrentUserAsync());
    }
  }, [dispatch, token, isAuthenticated]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {isAuthenticated && <Navbar />}
      
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/" 
          element={!isAuthenticated ? <HomePage /> : <Navigate to="/dashboard" />} 
        />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/cases" element={
          <ProtectedRoute>
            <CasesPage />
          </ProtectedRoute>
        } />
        
        <Route path="/sos" element={
          <ProtectedRoute>
            <SosPage />
          </ProtectedRoute>
        } />
        
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} />} />
      </Routes>
    </Box>
  );
};

export default AppRoutes;