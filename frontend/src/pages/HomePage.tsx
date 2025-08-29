import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  useTheme,
} from '@mui/material';
import {
  Gavel,
  Warning,
  Chat,
  Report,
  Security,
  Speed,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const features = [
    {
      icon: <Gavel sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Case Tracking',
      description: 'Track and follow legal cases with real-time updates and hearing schedules.',
    },
    {
      icon: <Warning sx={{ fontSize: 40, color: 'error.main' }} />,
      title: 'SOS Emergency',
      description: 'Quick access to emergency services with location-based assistance.',
    },
    {
      icon: <Chat sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'Legal Assistance',
      description: 'Get instant legal guidance through our AI-powered chat system.',
    },
    {
      icon: <Report sx={{ fontSize: 40, color: 'warning.main' }} />,
      title: 'Report Issues',
      description: 'Report corruption and legal violations anonymously and securely.',
    },
    {
      icon: <Security sx={{ fontSize: 40, color: 'info.main' }} />,
      title: 'Secure Platform',
      description: 'Your data is protected with enterprise-grade security measures.',
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Fast & Reliable',
      description: 'Access legal services 24/7 with our high-performance platform.',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Paper
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
            NyayaMitra
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ opacity: 0.9 }}>
            Your Digital Legal Companion
          </Typography>
          <Typography variant="h6" paragraph sx={{ opacity: 0.8, maxWidth: 600, mx: 'auto' }}>
            Empowering citizens with accessible legal services, case tracking, emergency assistance, and transparent justice.
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              sx={{
                backgroundColor: 'white',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'grey.100',
                },
              }}
              onClick={() => navigate('/register')}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </Box>
        </Container>
      </Paper>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          textAlign="center"
          gutterBottom
          fontWeight="bold"
          color="text.primary"
        >
          Legal Services for Everyone
        </Typography>
        <Typography
          variant="h6"
          textAlign="center"
          paragraph
          color="text.secondary"
          sx={{ maxWidth: 800, mx: 'auto', mb: 6 }}
        >
          Access comprehensive legal services from case tracking to emergency assistance,
          all in one secure and user-friendly platform.
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'center',
                  p: 2,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom fontWeight="bold">
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Paper
        sx={{
          backgroundColor: 'grey.50',
          py: 6,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" gutterBottom fontWeight="bold">
            Ready to Access Justice?
          </Typography>
          <Typography variant="h6" paragraph color="text.secondary">
            Join thousands of users who trust NyayaMitra for their legal needs.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
            onClick={() => navigate('/register')}
          >
            Create Your Account
          </Button>
        </Container>
      </Paper>
    </Box>
  );
};

export default HomePage;