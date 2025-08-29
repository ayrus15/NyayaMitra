import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const SosPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center">
        <Typography variant="h4" gutterBottom>
          SOS Emergency
        </Typography>
        <Typography variant="body1" color="text.secondary">
          SOS emergency functionality coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default SosPage;