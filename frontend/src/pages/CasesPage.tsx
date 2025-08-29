import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const CasesPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center">
        <Typography variant="h4" gutterBottom>
          Case Tracking
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Case tracking functionality coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default CasesPage;