import { create } from 'zustand';
import { api } from '../../utils/api';
import { format, subDays, addDays, parseISO } from 'date-fns';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export const useMealStore = create((set, get) => ({
  currentDate: todayStr(),
  meals: [],
  goals: { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, fiber_g: 30, water_ml: 2000 },
  waterLogs: [],
  weekStats: [],
  isLoaded: false,

  // ── Date navigation ──────────────────────────────────────────────────────

  setDate: (date) => {
    set({ currentDate: date });
    get().fetchDayData(date);
  },

  goToday: () => get().setDate(todayStr()),

  prevDay: () => {
    const prev = format(subDays(parseISO(get().currentDate), 1), 'yyyy-MM-dd');
    get().setDate(prev);
  },

  nextDay: () => {
    const next = format(addDays(parseISO(get().currentDate), 1), 'yyyy-MM-dd');
    get().setDate(next);
  },

  // ── Data fetching ────────────────────────────────────────────────────────

  fetchData: async () => {
    const { currentDate } = get();
    try {
      const [meals, water, goals, weekStats] = await Promise.all([
        api.get(`/meals/day/${currentDate}`),
        api.get(`/meals/water/${currentDate}`),
        api.get('/meals/goals'),
        api.get('/meals/stats/week'),
      ]);
      set({ meals, waterLogs: water, goals, weekStats, isLoaded: true });
    } catch (error) {
      console.error('Fetch meal data error:', error);
      set({ isLoaded: true });
    }
  },

  fetchDayData: async (date) => {
    const d = date || get().currentDate;
    try {
      const [meals, water] = await Promise.all([
        api.get(`/meals/day/${d}`),
        api.get(`/meals/water/${d}`),
      ]);
      set({ meals, waterLogs: water });
    } catch (error) {
      console.error('Fetch day data error:', error);
    }
  },

  refreshWeekStats: async () => {
    try {
      const weekStats = await api.get('/meals/stats/week');
      set({ weekStats });
    } catch (error) {
      console.error('Week stats error:', error);
    }
  },

  // ── Meals ────────────────────────────────────────────────────────────────

  addMeal: async (meal_type) => {
    const { currentDate, meals } = get();
    try {
      const newMeal = await api.post('/meals', { meal_date: currentDate, meal_type });
      set({ meals: [...meals, newMeal] });
      return newMeal;
    } catch (error) {
      console.error('Add meal error:', error);
      return null;
    }
  },

  findOrCreateMeal: async (meal_type) => {
    const { meals } = get();
    const existing = meals.find(m => m.meal_type === meal_type);
    if (existing) return existing;
    return get().addMeal(meal_type);
  },

  deleteMeal: async (id) => {
    const { meals } = get();
    set({ meals: meals.filter(m => m.id !== id) });
    try {
      await api.delete(`/meals/${id}`);
    } catch (error) {
      set({ meals });
    }
  },

  // ── Entries ──────────────────────────────────────────────────────────────

  addEntry: async (mealId, foodData, quantityG) => {
    try {
      const entry = await api.post('/meals/entries', {
        meal_id: mealId,
        food_name:          foodData.food_name,
        food_item_id:       foodData.food_item_id || null,
        quantity_g:         quantityG,
        calories_per_100g:  foodData.calories_per_100g,
        protein_per_100g:   foodData.protein_per_100g,
        carbs_per_100g:     foodData.carbs_per_100g,
        fat_per_100g:       foodData.fat_per_100g,
        fiber_per_100g:     foodData.fiber_per_100g,
      });
      set(state => ({
        meals: state.meals.map(m =>
          m.id === mealId ? { ...m, entries: [...(m.entries || []), entry] } : m
        ),
      }));
      return entry;
    } catch (error) {
      console.error('Add entry error:', error);
      return null;
    }
  },

  deleteEntry: async (entryId, mealId) => {
    const { meals } = get();
    set(state => ({
      meals: state.meals.map(m =>
        m.id === mealId
          ? { ...m, entries: (m.entries || []).filter(e => e.id !== entryId) }
          : m
      ),
    }));
    try {
      await api.delete(`/meals/entries/${entryId}`);
    } catch (error) {
      set({ meals });
    }
  },

  // ── Goals ────────────────────────────────────────────────────────────────

  saveGoals: async (newGoals) => {
    const prev = get().goals;
    set({ goals: newGoals });
    try {
      const updated = await api.post('/meals/goals', newGoals);
      set({ goals: updated });
    } catch (error) {
      set({ goals: prev });
    }
  },

  // ── Water ────────────────────────────────────────────────────────────────

  addWater: async (amount_ml = 250) => {
    const { currentDate, waterLogs } = get();
    try {
      const log = await api.post('/meals/water', { log_date: currentDate, amount_ml });
      set({ waterLogs: [...waterLogs, log] });
    } catch (error) {
      console.error('Add water error:', error);
    }
  },

  removeLastWater: async () => {
    const { waterLogs } = get();
    if (waterLogs.length === 0) return;
    const last = waterLogs[waterLogs.length - 1];
    set({ waterLogs: waterLogs.slice(0, -1) });
    try {
      await api.delete(`/meals/water/${last.id}`);
    } catch (error) {
      set({ waterLogs });
    }
  },

  // ── Computed selectors ───────────────────────────────────────────────────

  getDayTotals: () => {
    const { meals } = get();
    const t = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
    meals.forEach(meal =>
      (meal.entries || []).forEach(e => {
        t.calories  += parseFloat(e.calories)  || 0;
        t.protein_g += parseFloat(e.protein_g) || 0;
        t.carbs_g   += parseFloat(e.carbs_g)   || 0;
        t.fat_g     += parseFloat(e.fat_g)     || 0;
        t.fiber_g   += parseFloat(e.fiber_g)   || 0;
      })
    );
    return {
      calories:  Math.round(t.calories),
      protein_g: Math.round(t.protein_g * 10) / 10,
      carbs_g:   Math.round(t.carbs_g   * 10) / 10,
      fat_g:     Math.round(t.fat_g     * 10) / 10,
      fiber_g:   Math.round(t.fiber_g   * 10) / 10,
    };
  },

  getMealTotals: (mealId) => {
    const meal = get().meals.find(m => m.id === mealId);
    if (!meal) return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    const t = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    (meal.entries || []).forEach(e => {
      t.calories  += parseFloat(e.calories)  || 0;
      t.protein_g += parseFloat(e.protein_g) || 0;
      t.carbs_g   += parseFloat(e.carbs_g)   || 0;
      t.fat_g     += parseFloat(e.fat_g)     || 0;
    });
    return {
      calories:  Math.round(t.calories),
      protein_g: Math.round(t.protein_g * 10) / 10,
      carbs_g:   Math.round(t.carbs_g   * 10) / 10,
      fat_g:     Math.round(t.fat_g     * 10) / 10,
    };
  },

  getTotalWater: () =>
    get().waterLogs.reduce((sum, w) => sum + (w.amount_ml || 0), 0),
}));
