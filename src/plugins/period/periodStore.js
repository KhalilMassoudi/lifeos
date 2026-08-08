import { create } from 'zustand';
import { api } from '../../utils/api';
import { useToastStore } from '../../store/toastStore';

export const usePeriodStore = create((set, get) => ({
  logs: {}, // mapped as dateStr -> logObject
  cycles: [],
  settings: {
    average_cycle_length: 28,
    average_period_duration: 5,
    reminder_time: '09:00',
    show_fertile_window: true
  },
  stats: null,
  isLoaded: false,
  currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM

  setCurrentMonth: (month) => set({ currentMonth: month }),

  fetchData: async (month) => {
    const targetMonth = month || get().currentMonth;
    try {
      const [logsData, cyclesData, settingsData, statsData] = await Promise.all([
        api.get(`/period/logs?month=${targetMonth}`),
        api.get('/period/cycles'),
        api.get('/period/settings'),
        api.get('/period/stats')
      ]);

      // Map logs array to an object by log_date
      const logsMap = {};
      logsData.forEach(log => {
        logsMap[log.log_date] = log;
      });

      set({ 
        logs: logsMap, 
        cycles: cyclesData, 
        settings: settingsData || get().settings, 
        stats: statsData,
        isLoaded: true 
      });
    } catch (error) {
      console.error('Failed to fetch period tracker data:', error);
      set({ isLoaded: true });
    }
  },

  saveLog: async (logData) => {
    try {
      // Sanitize: ensure arrays are arrays, integers are integers, nulls are null
      const payload = {
        log_date: logData.log_date,
        is_period_day: Boolean(logData.is_period_day),
        is_period_start: Boolean(logData.is_period_start),
        is_period_end: Boolean(logData.is_period_end),
        flow_intensity: logData.flow_intensity || null,
        moods: Array.isArray(logData.moods) ? logData.moods : [],
        symptoms: Array.isArray(logData.symptoms) ? logData.symptoms : [],
        energy_level: logData.energy_level != null ? parseInt(logData.energy_level, 10) : null,
        notes: logData.notes || ''
      };

      const savedLog = await api.post('/period/log', payload);
      
      // Update local logs object
      set(state => ({
        logs: {
          ...state.logs,
          [savedLog.log_date]: savedLog
        }
      }));

      // Re-fetch cycles & stats in the background to get updated predictions
      const [cyclesData, statsData] = await Promise.all([
        api.get('/period/cycles'),
        api.get('/period/stats')
      ]);
      
      set({ cycles: cyclesData, stats: statsData });
      useToastStore.getState().addToast('Day logged successfully! 🌸', 'success');
    } catch (error) {
      console.error('Failed to save log:', error);
      useToastStore.getState().addToast(`Failed to save log: ${error.message}`, 'error');
    }
  },

  updateSettings: async (settingsUpdates) => {
    try {
      const updated = await api.put('/period/settings', settingsUpdates);
      set({ settings: updated });
      
      // Re-fetch stats as they depend on average settings
      const statsData = await api.get('/period/stats');
      set({ stats: statsData });
      
      useToastStore.getState().addToast('Settings updated successfully.', 'success');
    } catch (error) {
      console.error('Failed to update settings:', error);
      useToastStore.getState().addToast('Failed to update settings.', 'error');
    }
  }
}));
