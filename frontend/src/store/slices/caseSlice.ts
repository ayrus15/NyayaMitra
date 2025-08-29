import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { caseAPI } from '../../services/api';
import { Case, CaseSearchParams } from '../../types';

interface CaseState {
  cases: Case[];
  followedCases: Case[];
  currentCase: Case | null;
  loading: boolean;
  error: string | null;
  searchParams: CaseSearchParams;
}

const initialState: CaseState = {
  cases: [],
  followedCases: [],
  currentCase: null,
  loading: false,
  error: null,
  searchParams: {},
};

// Async thunks
export const searchCasesAsync = createAsyncThunk(
  'cases/searchCases',
  async (params: CaseSearchParams, { rejectWithValue }) => {
    try {
      const response = await caseAPI.searchCases(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Search failed');
    }
  }
);

export const followCaseAsync = createAsyncThunk(
  'cases/followCase',
  async (caseId: string, { rejectWithValue }) => {
    try {
      const response = await caseAPI.followCase(caseId);
      return { caseId, data: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to follow case');
    }
  }
);

export const unfollowCaseAsync = createAsyncThunk(
  'cases/unfollowCase',
  async (caseId: string, { rejectWithValue }) => {
    try {
      const response = await caseAPI.unfollowCase(caseId);
      return { caseId, data: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to unfollow case');
    }
  }
);

export const getFollowedCasesAsync = createAsyncThunk(
  'cases/getFollowedCases',
  async (_, { rejectWithValue }) => {
    try {
      const response = await caseAPI.getFollowedCases();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get followed cases');
    }
  }
);

const caseSlice = createSlice({
  name: 'cases',
  initialState,
  reducers: {
    setSearchParams: (state, action: PayloadAction<CaseSearchParams>) => {
      state.searchParams = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCase: (state, action: PayloadAction<Case | null>) => {
      state.currentCase = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Search cases
      .addCase(searchCasesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchCasesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.cases = action.payload.cases || [];
        state.error = null;
      })
      .addCase(searchCasesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Follow case
      .addCase(followCaseAsync.fulfilled, (state, action) => {
        // Add to followed cases or update existing
        const existingIndex = state.followedCases.findIndex(
          (c) => c.id === action.payload.caseId
        );
        if (existingIndex === -1) {
          // Find the case in the main cases list and add to followed
          const caseToFollow = state.cases.find((c) => c.id === action.payload.caseId);
          if (caseToFollow) {
            state.followedCases.push(caseToFollow);
          }
        }
      })
      // Unfollow case
      .addCase(unfollowCaseAsync.fulfilled, (state, action) => {
        state.followedCases = state.followedCases.filter(
          (c) => c.id !== action.payload.caseId
        );
      })
      // Get followed cases
      .addCase(getFollowedCasesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFollowedCasesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.followedCases = action.payload.cases || [];
        state.error = null;
      })
      .addCase(getFollowedCasesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchParams, clearError, setCurrentCase } = caseSlice.actions;
export default caseSlice.reducer;