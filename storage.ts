export type Period = "daily" | "weekly" | "monthly";

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  title?: string;
  description?: string;
  timestamp: number;
  time: string;
  importedStatementId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Settings {
  period: Period;
  budget: number;
  currency: string;
  locale: string;
}

export interface ImportedStatement {
  id: string;
  source: string;
  importedAt: number;
  total: number;
  items: Expense[];
}

export interface StorageState {
  settings: Settings;
  categories: Category[];
  expenses: Expense[];
  importedStatements: ImportedStatement[];
}

export interface StorageApi {
  load: () => StorageState;
  save: (state: StorageState) => StorageState;
  getExpenses: () => Expense[];
  addExpense: (expense: Expense) => Expense[];
  updateExpense: (id: string, updates: Partial<Expense>) => Expense[];
  deleteExpense: (id: string) => Expense[];
  getSettings: () => Settings;
  updateSettings: (updates: Partial<Settings>) => Settings;
  getCategories: () => Category[];
  addCategory: (category: Category) => Category[];
  updateCategory: (id: string, updates: Partial<Category>) => Category[];
  deleteCategory: (id: string) => Category[];
  getImportedStatements: () => ImportedStatement[];
  addImportedStatement: (statement: ImportedStatement) => ImportedStatement[];
  updateImportedStatement: (id: string, updates: Partial<ImportedStatement>) => ImportedStatement[];
  deleteImportedStatement: (id: string) => ImportedStatement[];
}

export interface MockApi {
  load: () => Promise<StorageState>;
  save: (state: StorageState) => Promise<StorageState>;
  getExpenses: () => Promise<Expense[]>;
  addExpense: (expense: Expense) => Promise<Expense[]>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<Expense[]>;
  deleteExpense: (id: string) => Promise<Expense[]>;
  getSettings: () => Promise<Settings>;
  updateSettings: (updates: Partial<Settings>) => Promise<Settings>;
  getCategories: () => Promise<Category[]>;
  addCategory: (category: Category) => Promise<Category[]>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<Category[]>;
  deleteCategory: (id: string) => Promise<Category[]>;
  getImportedStatements: () => Promise<ImportedStatement[]>;
  addImportedStatement: (statement: ImportedStatement) => Promise<ImportedStatement[]>;
  updateImportedStatement: (id: string, updates: Partial<ImportedStatement>) => Promise<ImportedStatement[]>;
  deleteImportedStatement: (id: string) => Promise<ImportedStatement[]>;
}
