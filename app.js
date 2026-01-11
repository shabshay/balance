import { calculateBalance, createMockApi, createStorage } from "./storage.js";

const views = Array.from(document.querySelectorAll(".view"));
const storage = createStorage();
const api = createMockApi(storage);
const state = {
  period: "weekly",
  budget: 0,
  expenses: [],
  categories: [],
  settings: {},
  expenseDraft: {
    amount: "",
    title: "",
    description: "",
    categoryId: "food",
  },
};

const onboardingBudget = document.getElementById("onboarding-budget");
const balanceLeft = document.getElementById("balance-left");
const resetLabel = document.getElementById("reset-label");
const balanceRing = document.getElementById("balance-ring");
const currentBalance = document.getElementById("current-balance");
const budgetTotal = document.getElementById("budget-total");
const budgetSpent = document.getElementById("budget-spent");
const budgetProgress = document.getElementById("budget-progress");
const progressLabel = document.getElementById("progress-label");
const progressRemaining = document.getElementById("progress-remaining");
const recentExpenses = document.getElementById("recent-expenses");
const expenseAmount = document.getElementById("expense-amount");
const expenseAmountReview = document.getElementById("expense-amount-review");
const expenseAmountFinal = document.getElementById("expense-amount-final");
const expenseTitle = document.getElementById("expense-title");
const expenseDescription = document.getElementById("expense-description");
const categoryChips = document.getElementById("category-chips");

const formatMoney = (value) => Number(value || 0).toLocaleString("he-IL", { minimumFractionDigits: 0 });

const getDefaultCategoryId = () => state.categories[0]?.id || "food";

const showView = (name) => {
  views.forEach((view) => {
    view.hidden = view.dataset.view !== name;
  });
};

const updatePeriodSelection = (period) => {
  document.querySelectorAll("[data-period]").forEach((button) => {
    const selected = button.dataset.period === period;
    button.setAttribute("aria-checked", selected ? "true" : "false");
  });
};

const updateBudgetDisplay = () => {
  if (onboardingBudget) {
    onboardingBudget.value = state.budget ? String(state.budget) : "";
  }
};

const updateBalance = () => {
  const { left, percent } = calculateBalance(
    { period: state.period, budget: state.budget },
    state.expenses,
  );
  const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const balance = state.budget - totalSpent;
  const utilization = state.budget > 0 ? Math.min(totalSpent / state.budget, 1) : 0;
  balanceLeft.textContent = formatMoney(left);
  const degrees = Math.round(percent * 360);
  balanceRing.style.background = `conic-gradient(var(--accent) ${degrees}deg, #e9eef5 ${degrees}deg)`;
  resetLabel.textContent = state.period === "weekly" ? "Resets in 3d 4h" : state.period === "monthly" ? "Resets in 12d 2h" : "Resets in 8h 46m";
  currentBalance.textContent = formatMoney(balance);
  budgetTotal.textContent = formatMoney(state.budget);
  budgetSpent.textContent = formatMoney(totalSpent);
  progressLabel.textContent = `${Math.round(utilization * 100)}% used`;
  progressRemaining.textContent = `${formatMoney(Math.max(state.budget - totalSpent, 0))} left`;
  budgetProgress.style.width = `${Math.round(utilization * 100)}%`;
  budgetProgress.classList.remove("low", "medium", "high");
  if (utilization < 0.6) {
    budgetProgress.classList.add("low");
  } else if (utilization < 0.85) {
    budgetProgress.classList.add("medium");
  } else {
    budgetProgress.classList.add("high");
  }
  budgetProgress.parentElement?.setAttribute("aria-valuenow", String(Math.round(utilization * 100)));
};

const renderExpenses = () => {
  if (state.expenses.length === 0) {
    recentExpenses.classList.add("empty");
    recentExpenses.innerHTML = "<p>No expenses yet</p><span>Tap \"Add expense\" to get started</span>";
    return;
  }

  recentExpenses.classList.remove("empty");
  recentExpenses.innerHTML = "";
  state.expenses.slice(-5).reverse().forEach((expense) => {
    const category = state.categories.find((item) => item.id === expense.categoryId);
    const item = document.createElement("div");
    item.className = "expense-item";
    item.innerHTML = `
      <div class="expense-meta">
        <div class="category-icon">${category?.icon || "💸"}</div>
        <div>
          <strong>${expense.title || category?.name || "Expense"}</strong>
          <div class="subtitle">${category?.name || ""} · ${expense.time}</div>
        </div>
      </div>
      <strong>₪${formatMoney(expense.amount)}</strong>
    `;
    recentExpenses.appendChild(item);
  });
};

const updateExpenseAmounts = () => {
  const formatted = formatMoney(state.expenseDraft.amount || 0);
  expenseAmount.textContent = formatted;
  expenseAmountReview.textContent = formatted;
  expenseAmountFinal.textContent = formatted;
};

const resetDraft = () => {
  state.expenseDraft = {
    amount: "",
    title: "",
    description: "",
    categoryId: getDefaultCategoryId(),
  };
  expenseTitle.value = "";
  expenseDescription.value = "";
  updateExpenseAmounts();
  renderCategoryChips();
};

const renderCategoryChips = () => {
  categoryChips.innerHTML = "";
  state.categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-chip";
    if (category.id === state.expenseDraft.categoryId) {
      button.classList.add("active");
    }
    button.textContent = `${category.icon} ${category.name}`;
    button.addEventListener("click", () => {
      state.expenseDraft.categoryId = category.id;
      renderCategoryChips();
    });
    categoryChips.appendChild(button);
  });
};

const addExpense = async () => {
  const amountNumber = Number(state.expenseDraft.amount || 0);
  if (!amountNumber) {
    return;
  }
  const expense = {
    id: crypto.randomUUID(),
    amount: amountNumber,
    categoryId: state.expenseDraft.categoryId,
    title: state.expenseDraft.title,
    description: state.expenseDraft.description,
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
  state.expenses = await api.addExpense(expense);
  resetDraft();
  updateBalance();
  renderExpenses();
};

const updateFromStorage = async () => {
  const stored = await api.load();
  state.settings = stored.settings;
  state.period = stored.settings.period;
  state.budget = stored.settings.budget;
  state.expenses = stored.expenses;
  state.categories = stored.categories;
  state.expenseDraft.categoryId = getDefaultCategoryId();
  updatePeriodSelection(state.period);
  updateBudgetDisplay();
  updateBalance();
  renderExpenses();
  renderCategoryChips();
  showView(state.budget > 0 ? "home" : "onboarding");
};

const handleKeypad = (key) => {
  if (key === "back") {
    state.expenseDraft.amount = state.expenseDraft.amount.slice(0, -1);
  } else if (key === ".") {
    if (!state.expenseDraft.amount.includes(".")) {
      state.expenseDraft.amount += ".";
    }
  } else {
    state.expenseDraft.amount += key;
  }
  updateExpenseAmounts();
};

const isExpenseAmountValid = () => Number(state.expenseDraft.amount) > 0;

const setPeriod = async (period) => {
  state.period = period;
  updatePeriodSelection(period);
  state.settings = await api.updateSettings({ period });
  updateBalance();
};

const setBudget = async (budget) => {
  state.budget = budget;
  updateBudgetDisplay();
  state.settings = await api.updateSettings({ budget });
  updateBalance();
};

const saveOnboarding = async () => {
  const budgetValue = Number(onboardingBudget.value || 0);
  if (!budgetValue) {
    return;
  }
  state.budget = budgetValue;
  state.settings = await api.updateSettings({ budget: budgetValue, period: state.period });
  updateBudgetDisplay();
  updateBalance();
  showView("home");
};

const registerEvents = () => {
  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      void setPeriod(button.dataset.period);
    });
  });

  document.querySelector("[data-action='save-onboarding']").addEventListener("click", () => {
    void saveOnboarding();
  });

  document.querySelector("[data-action='add-expense']").addEventListener("click", () => {
    resetDraft();
    showView("amount");
  });

  document.querySelector("[data-action='cancel-expense']").addEventListener("click", () => {
    showView("home");
  });

  document.querySelector("[data-action='to-details']").addEventListener("click", () => {
    if (!isExpenseAmountValid()) {
      return;
    }
    showView("details");
  });

  document.querySelector("[data-action='back-to-amount']").addEventListener("click", () => {
    showView("amount");
  });

  document.querySelector("[data-action='to-category']").addEventListener("click", () => {
    state.expenseDraft.title = expenseTitle.value;
    state.expenseDraft.description = expenseDescription.value;
    showView("category");
  });

  document.querySelectorAll("[data-action='back-to-details']").forEach((button) => {
    button.addEventListener("click", () => {
      showView("details");
    });
  });

  document.querySelector("[data-action='save-expense']").addEventListener("click", () => {
    void addExpense();
    showView("home");
  });

  document.querySelectorAll("[data-key]").forEach((button) => {
    button.addEventListener("click", () => handleKeypad(button.dataset.key));
  });
};

const init = async () => {
  await updateFromStorage();
  registerEvents();
  updateExpenseAmounts();
};

void init();
