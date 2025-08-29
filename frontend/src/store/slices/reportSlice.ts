import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { reportAPI } from '../../services/api';
import { CorruptionReport, ReportRequest } from '../../types';

interface ReportState {
  reports: CorruptionReport[];
  currentReport: CorruptionReport | null;
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  reports: [],
  currentReport: null,
  loading: false,
  error: null,
};

// Async thunks
export const submitReportAsync = createAsyncThunk(
  'reports/submitReport',
  async (reportData: ReportRequest, { rejectWithValue }) => {
    try {
      const response = await reportAPI.submitReport(reportData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to submit report');
    }
  }
);

export const getReportsAsync = createAsyncThunk(
  'reports/getReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await reportAPI.getReports();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get reports');
    }
  }
);

export const getReportByIdAsync = createAsyncThunk(
  'reports/getReportById',
  async (reportId: string, { rejectWithValue }) => {
    try {
      const response = await reportAPI.getReportById(reportId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get report');
    }
  }
);

export const updateReportStatusAsync = createAsyncThunk(
  'reports/updateStatus',
  async ({ reportId, status }: { reportId: string; status: string }, { rejectWithValue }) => {
    try {
      const response = await reportAPI.updateReportStatus(reportId, status);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update status');
    }
  }
);

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentReport: (state, action: PayloadAction<CorruptionReport | null>) => {
      state.currentReport = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit report
      .addCase(submitReportAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReportAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.reports.unshift(action.payload.report);
        state.error = null;
      })
      .addCase(submitReportAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get reports
      .addCase(getReportsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReportsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.reports || [];
        state.error = null;
      })
      .addCase(getReportsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get report by ID
      .addCase(getReportByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReportByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReport = action.payload.report;
        state.error = null;
      })
      .addCase(getReportByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update status
      .addCase(updateReportStatusAsync.fulfilled, (state, action) => {
        const index = state.reports.findIndex((report) => report.id === action.payload.report.id);
        if (index !== -1) {
          state.reports[index] = action.payload.report;
        }
        if (state.currentReport?.id === action.payload.report.id) {
          state.currentReport = action.payload.report;
        }
      });
  },
});

export const { clearError, setCurrentReport } = reportSlice.actions;
export default reportSlice.reducer;