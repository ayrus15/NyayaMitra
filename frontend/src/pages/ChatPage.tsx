import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ChatPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center">
        <Typography variant="h4" gutterBottom>
          Legal Assistant Chat
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Chat functionality coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default ChatPage;