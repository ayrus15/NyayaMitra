import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Gavel,
  Warning,
  Chat,
  Report,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { getFollowedCasesAsync } from '../store/slices/caseSlice';
import { getSosHistoryAsync } from '../store/slices/sosSlice';
import { getSessionsAsync } from '../store/slices/chatSlice';
import { getReportsAsync } from '../store/slices/reportSlice';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { followedCases } = useSelector((state: RootState) => state.cases);
  const { incidents, emergencyMode } = useSelector((state: RootState) => state.sos);
  const { sessions } = useSelector((state: RootState) => state.chat);
  const { reports } = useSelector((state: RootState) => state.reports);

  useEffect(() => {
    // Load dashboard data
    dispatch(getFollowedCasesAsync());
    dispatch(getSosHistoryAsync());
    dispatch(getSessionsAsync());
    dispatch(getReportsAsync());
  }, [dispatch]);

  const quickActions = [
    {
      title: 'Track Cases',
      description: 'Search and follow legal cases',
      icon: <Gavel sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      path: '/cases',
    },
    {
      title: 'SOS Emergency',
      description: 'Quick access to emergency services',
      icon: <Warning sx={{ fontSize: 40 }} />,
      color: 'error.main',
      path: '/sos',
    },
    {
      title: 'Legal Chat',
      description: 'Get instant legal assistance',
      icon: <Chat sx={{ fontSize: 40 }} />,
      color: 'success.main',
      path: '/chat',
    },
    {
      title: 'Submit Report',
      description: 'Report corruption or issues',
      icon: <Report sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      path: '/reports',
    },
  ];

  const stats = [
    {
      label: 'Followed Cases',
      value: followedCases.length,
      icon: <Gavel />,
      color: 'primary.main',
    },
    {
      label: 'SOS History',
      value: incidents.length,
      icon: <Warning />,
      color: 'error.main',
    },
    {
      label: 'Chat Sessions',
      value: sessions.length,
      icon: <Chat />,
      color: 'success.main',
    },
    {
      label: 'Reports',
      value: reports.length,
      icon: <Report />,
      color: 'warning.main',
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Welcome Section */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: emergencyMode 
            ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
            : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'rgba(255,255,255,0.2)',
            }}
          >
            {user?.firstName[0]}{user?.lastName[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>
              Welcome back, {user?.firstName}!
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {emergencyMode 
                ? 'Emergency Mode Active - Help is on the way'
                : 'Your legal companion is ready to assist you'
              }
            </Typography>
            <Chip
              label={user?.role}
              sx={{
                mt: 1,
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
              }}
            />
          </Box>
          {emergencyMode && (
            <Box sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 48, animation: 'pulse 1s infinite' }} />
              <Typography variant="caption" display="block">
                EMERGENCY
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: `${stat.color}20`,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Quick Actions
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => navigate(action.path)}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: `${action.color}20`,
                    color: action.color,
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {action.icon}
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Recent Cases
              </Typography>
              {followedCases.length > 0 ? (
                followedCases.slice(0, 3).map((case_, index) => (
                  <Box key={index} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {case_.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {case_.court} • {case_.status}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No cases followed yet
                </Typography>
              )}
              <Button
                variant="text"
                sx={{ mt: 2 }}
                onClick={() => navigate('/cases')}
              >
                View All Cases
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Recent Reports
              </Typography>
              {reports.length > 0 ? (
                reports.slice(0, 3).map((report, index) => (
                  <Box key={index} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {report.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {report.category} • {report.status}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No reports submitted yet
                </Typography>
              )}
              <Button
                variant="text"
                sx={{ mt: 2 }}
                onClick={() => navigate('/reports')}
              >
                View All Reports
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;