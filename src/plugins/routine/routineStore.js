import { create } from 'zustand';
import { api } from '../../utils/api';
import { format } from 'date-fns';

const dateKey = (date) => format(date, 'yyyy-MM-dd');

export const useRoutineStore = create((set, get) => ({
  blocks: [],
  logs: [],
  tasks: [],
  isLoaded: false,

  fetchData: async () => {
    try {
      const [blocks, logs, tasks] = await Promise.all([
        api.get('/routine/blocks'),
        api.get('/routine/logs'),
        api.get('/routine/tasks')
      ]);
      set({ blocks, logs, tasks, isLoaded: true });
    } catch (error) {
      console.error('Failed to fetch routine data', error);
      set({ isLoaded: true });
    }
  },

  addBlock: async (blockData) => {
    try {
      const newBlock = await api.post('/routine/blocks', blockData);
      set(state => {
        const newBlocks = [...state.blocks, newBlock].sort((a, b) => a.time.localeCompare(b.time));
        return { blocks: newBlocks };
      });
    } catch (error) {
      console.error('Failed to add routine block', error);
    }
  },

  deleteBlock: async (id) => {
    const { blocks } = get();
    set(state => ({ blocks: state.blocks.filter(b => b.id !== id) }));
    try {
      await api.delete(`/routine/blocks/${id}`);
    } catch (error) {
      set({ blocks });
    }
  },

  toggleLog: async (blockId, dateObj) => {
    const { logs } = get();
    const dateStr = dateKey(dateObj);
    
    const existingLog = logs.find(l => l.block_id === blockId && l.date === dateStr);
    const newCompleted = existingLog ? !existingLog.completed : true;

    if (existingLog) {
      set(state => ({
        logs: state.logs.map(l => l.block_id === blockId && l.date === dateStr ? { ...l, completed: newCompleted } : l)
      }));
    } else {
      set(state => ({
        logs: [...state.logs, { block_id: blockId, date: dateStr, completed: newCompleted }]
      }));
    }

    try {
      await api.post('/routine/logs/toggle', { block_id: blockId, date: dateStr, completed: newCompleted });
    } catch (error) {
      set({ logs });
    }
  },

  getLogStatus: (blockId, dateObj) => {
    const log = get().logs.find(l => l.block_id === blockId && l.date === dateKey(dateObj));
    return log ? log.completed : false;
  },

  addTask: async (taskData) => {
    try {
      const newTask = await api.post('/routine/tasks', taskData);
      set(state => ({ tasks: [newTask, ...state.tasks] }));
    } catch (error) {
      console.error('Failed to add task', error);
    }
  },

  updateTask: async (id, updates) => {
    const { tasks } = get();
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    try {
      await api.put(`/routine/tasks/${id}`, updates);
    } catch (error) {
      set({ tasks });
    }
  },

  deleteTask: async (id) => {
    const { tasks } = get();
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    try {
      await api.delete(`/routine/tasks/${id}`);
    } catch (error) {
      set({ tasks });
    }
  }
}));
