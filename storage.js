const STORAGE_KEY = "balance-storage";

const defaultCategories = [
  { id: "food", name: "Food", icon: "🍴" },
  { id: "transport", name: "Transport", icon: "🚗" },
  { id: "shopping", name: "Shopping", icon: "🛍️" },
  { id: "fun", name: "Fun", icon: "✨" },
  { id: "other", name: "Other", icon: "…" },
];

const defaultSettings = {
  period: "weekly",
  budget: 0,
  currency: "₪",
  locale: "he-IL",
  alertsEnabled: false,
};

const buildSeedState = (stored = {}) => {
  const categories = Array.isArray(stored.categories) && stored.categories.length > 0
    ? stored.categories
    : defaultCategories;
  const settings = {
    ...defaultSettings,
    ...(stored.settings || {}),
  };
  const expenses = Array.isArray(stored.expenses) ? stored.expenses : [];
  const importedStatements = Array.isArray(stored.importedStatements)
    ? stored.importedStatements
    : [];
  return {
    settings,
    categories,
    expenses,
    importedStatements,
  };
};

const parseStoredState = (key) => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    return buildSeedState();
  }
  try {
    return buildSeedState(JSON.parse(stored));
  } catch (error) {
    console.warn("Failed to parse stored data", error);
    return buildSeedState();
  }
};

const persistState = (key, state) => {
  localStorage.setItem(key, JSON.stringify(state));
};

export const createStorage = (key = STORAGE_KEY) => {
  const load = () => {
    const state = parseStoredState(key);
    persistState(key, state);
    return state;
  };

  const save = (nextState) => {
    const state = buildSeedState(nextState);
    persistState(key, state);
    return state;
  };

  const clear = () => {
    localStorage.removeItem(key);
    return buildSeedState();
  };

  const getExpenses = () => load().expenses;

  const addExpense = (expense) => {
    const state = load();
    state.expenses = [...state.expenses, expense];
    save(state);
    return state.expenses;
  };

  const updateExpense = (id, updates) => {
    const state = load();
    state.expenses = state.expenses.map((expense) =>
      expense.id === id ? { ...expense, ...updates } : expense,
    );
    save(state);
    return state.expenses;
  };

  const deleteExpense = (id) => {
    const state = load();
    state.expenses = state.expenses.filter((expense) => expense.id !== id);
    save(state);
    return state.expenses;
  };

  const getSettings = () => load().settings;

  const updateSettings = (updates) => {
    const state = load();
    state.settings = { ...state.settings, ...updates };
    save(state);
    return state.settings;
  };

  const getCategories = () => load().categories;

  const addCategory = (category) => {
    const state = load();
    state.categories = [...state.categories, category];
    save(state);
    return state.categories;
  };

  const updateCategory = (id, updates) => {
    const state = load();
    state.categories = state.categories.map((category) =>
      category.id === id ? { ...category, ...updates } : category,
    );
    save(state);
    return state.categories;
  };

  const deleteCategory = (id) => {
    const state = load();
    state.categories = state.categories.filter((category) => category.id !== id);
    save(state);
    return state.categories;
  };

  const getImportedStatements = () => load().importedStatements;

  const addImportedStatement = (statement) => {
    const state = load();
    state.importedStatements = [...state.importedStatements, statement];
    save(state);
    return state.importedStatements;
  };

  const updateImportedStatement = (id, updates) => {
    const state = load();
    state.importedStatements = state.importedStatements.map((statement) =>
      statement.id === id ? { ...statement, ...updates } : statement,
    );
    save(state);
    return state.importedStatements;
  };

  const deleteImportedStatement = (id) => {
    const state = load();
    state.importedStatements = state.importedStatements.filter((statement) => statement.id !== id);
    save(state);
    return state.importedStatements;
  };

  return {
    load,
    save,
    clear,
    getExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getSettings,
    updateSettings,
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getImportedStatements,
    addImportedStatement,
    updateImportedStatement,
    deleteImportedStatement,
  };
};

export const createMockApi = (
  storage,
  { minDelay = 200, maxDelay = 500 } = {},
) => {
  const withLatency = (fn) => {
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    return new Promise((resolve) => {
      setTimeout(() => resolve(fn()), delay);
    });
  };

  return {
    load: () => withLatency(storage.load),
    save: (state) => withLatency(() => storage.save(state)),
    clear: () => withLatency(() => storage.clear()),
    getExpenses: () => withLatency(storage.getExpenses),
    addExpense: (expense) => withLatency(() => storage.addExpense(expense)),
    updateExpense: (id, updates) => withLatency(() => storage.updateExpense(id, updates)),
    deleteExpense: (id) => withLatency(() => storage.deleteExpense(id)),
    getSettings: () => withLatency(storage.getSettings),
    updateSettings: (updates) => withLatency(() => storage.updateSettings(updates)),
    getCategories: () => withLatency(storage.getCategories),
    addCategory: (category) => withLatency(() => storage.addCategory(category)),
    updateCategory: (id, updates) => withLatency(() => storage.updateCategory(id, updates)),
    deleteCategory: (id) => withLatency(() => storage.deleteCategory(id)),
    getImportedStatements: () => withLatency(storage.getImportedStatements),
    addImportedStatement: (statement) => withLatency(() => storage.addImportedStatement(statement)),
    updateImportedStatement: (id, updates) => withLatency(() => storage.updateImportedStatement(id, updates)),
    deleteImportedStatement: (id) => withLatency(() => storage.deleteImportedStatement(id)),
  };
};

const getPeriodStart = (period, now) => {
  const start = new Date(now);
  if (period === "weekly") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  } else if (period === "monthly") {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
};

export const filterExpensesByPeriod = (expenses, period, now = new Date()) => {
  const start = getPeriodStart(period, now);
  return expenses.filter((expense) => expense.timestamp >= start.getTime());
};

export const calculateBalance = (settings, expenses, now = new Date()) => {
  const scopedExpenses = filterExpensesByPeriod(expenses, settings.period, now);
  const spent = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const total = settings.budget || 0;
  const left = Math.max(total - spent, 0);
  const percent = total > 0 ? Math.min(spent / total, 1) : 0;
  return {
    spent,
    left,
    percent,
    total,
    expenses: scopedExpenses,
  };
};
