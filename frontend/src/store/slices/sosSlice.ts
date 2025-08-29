import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { sosAPI } from '../../services/api';
import { SosIncident, SosRequest } from '../../types';

interface SosState {
  incidents: SosIncident[];
  activeIncident: SosIncident | null;
  loading: boolean;
  error: string | null;
  emergencyMode: boolean;
}

const initialState: SosState = {
  incidents: [],
  activeIncident: null,
  loading: false,
  error: null,
  emergencyMode: false,
};

// Async thunks
export const createSosAsync = createAsyncThunk(
  'sos/createSos',
  async (sosData: SosRequest, { rejectWithValue }) => {
    try {
      const response = await sosAPI.createSos(sosData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create SOS');
    }
  }
);

export const updateSosLocationAsync = createAsyncThunk(
  'sos/updateLocation',
  async ({ incidentId, location }: { incidentId: string; location: { lat: number; lng: number } }, { rejectWithValue }) => {
    try {
      const response = await sosAPI.updateLocation(incidentId, location);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update location');
    }
  }
);

export const cancelSosAsync = createAsyncThunk(
  'sos/cancelSos',
  async (incidentId: string, { rejectWithValue }) => {
    try {
      const response = await sosAPI.cancelSos(incidentId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to cancel SOS');
    }
  }
);

export const getSosHistoryAsync = createAsyncThunk(
  'sos/getHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await sosAPI.getHistory();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get SOS history');
    }
  }
);

const sosSlice = createSlice({
  name: 'sos',
  initialState,
  reducers: {
    setEmergencyMode: (state, action: PayloadAction<boolean>) => {
      state.emergencyMode = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setActiveIncident: (state, action: PayloadAction<SosIncident | null>) => {
      state.activeIncident = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create SOS
      .addCase(createSosAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSosAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.activeIncident = action.payload.incident;
        state.incidents.unshift(action.payload.incident);
        state.emergencyMode = true;
        state.error = null;
      })
      .addCase(createSosAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.emergencyMode = false;
      })
      // Update location
      .addCase(updateSosLocationAsync.fulfilled, (state, action) => {
        if (state.activeIncident) {
          state.activeIncident = action.payload.incident;
        }
        // Update in incidents list
        const index = state.incidents.findIndex(
          (incident) => incident.id === action.payload.incident.id
        );
        if (index !== -1) {
          state.incidents[index] = action.payload.incident;
        }
      })
      // Cancel SOS
      .addCase(cancelSosAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelSosAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.activeIncident = null;
        state.emergencyMode = false;
        // Update in incidents list
        const index = state.incidents.findIndex(
          (incident) => incident.id === action.payload.incident.id
        );
        if (index !== -1) {
          state.incidents[index] = action.payload.incident;
        }
        state.error = null;
      })
      .addCase(cancelSosAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get history
      .addCase(getSosHistoryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSosHistoryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.incidents = action.payload.incidents || [];
        state.error = null;
      })
      .addCase(getSosHistoryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setEmergencyMode, clearError, setActiveIncident } = sosSlice.actions;
export default sosSlice.reducer;