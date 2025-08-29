import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { chatAPI } from '../../services/api';
import { ChatSession, ChatMessage, MessageRequest } from '../../types';

interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
}

const initialState: ChatState = {
  sessions: [],
  currentSession: null,
  messages: [],
  loading: false,
  sending: false,
  error: null,
};

// Async thunks
export const createSessionAsync = createAsyncThunk(
  'chat/createSession',
  async (title: string | undefined, { rejectWithValue }) => {
    try {
      const response = await chatAPI.createSession(title);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create session');
    }
  }
);

export const getSessionsAsync = createAsyncThunk(
  'chat/getSessions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await chatAPI.getSessions();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get sessions');
    }
  }
);

export const getSessionMessagesAsync = createAsyncThunk(
  'chat/getSessionMessages',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const response = await chatAPI.getSessionMessages(sessionId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get messages');
    }
  }
);

export const sendMessageAsync = createAsyncThunk(
  'chat/sendMessage',
  async ({ sessionId, message }: { sessionId: string; message: MessageRequest }, { rejectWithValue }) => {
    try {
      const response = await chatAPI.sendMessage(sessionId, message);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to send message');
    }
  }
);

export const deleteSessionAsync = createAsyncThunk(
  'chat/deleteSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      await chatAPI.deleteSession(sessionId);
      return sessionId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete session');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<ChatSession | null>) => {
      state.currentSession = action.payload;
      state.messages = []; // Clear messages when switching sessions
    },
    clearError: (state) => {
      state.error = null;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Create session
      .addCase(createSessionAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSessionAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions.unshift(action.payload.session);
        state.currentSession = action.payload.session;
        state.messages = [];
        state.error = null;
      })
      .addCase(createSessionAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get sessions
      .addCase(getSessionsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSessionsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload.sessions || [];
        state.error = null;
      })
      .addCase(getSessionsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get messages
      .addCase(getSessionMessagesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSessionMessagesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages || [];
        state.error = null;
      })
      .addCase(getSessionMessagesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Send message
      .addCase(sendMessageAsync.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessageAsync.fulfilled, (state, action) => {
        state.sending = false;
        // Add user message and AI response
        if (action.payload.userMessage) {
          state.messages.push(action.payload.userMessage);
        }
        if (action.payload.assistantMessage) {
          state.messages.push(action.payload.assistantMessage);
        }
        state.error = null;
      })
      .addCase(sendMessageAsync.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload as string;
      })
      // Delete session
      .addCase(deleteSessionAsync.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter((session) => session.id !== action.payload);
        if (state.currentSession?.id === action.payload) {
          state.currentSession = null;
          state.messages = [];
        }
      });
  },
});

export const { setCurrentSession, clearError, addMessage } = chatSlice.actions;
export default chatSlice.reducer;