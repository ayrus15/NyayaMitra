import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ReportsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center">
        <Typography variant="h4" gutterBottom>
          Submit Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Report submission functionality coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default ReportsPage;