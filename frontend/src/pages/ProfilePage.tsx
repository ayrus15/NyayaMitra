import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center">
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Profile functionality coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default ProfilePage;