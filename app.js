const views = Array.from(document.querySelectorAll(".view"));
const state = {
  period: "daily",
  budget: 0,
  expenses: [],
  expenseDraft: {
    amount: "",
    title: "",
    description: "",
    categoryId: "food",
  },
};

const categories = [
  { id: "food", name: "Food", icon: "🍴" },
  { id: "transport", name: "Transport", icon: "🚗" },
  { id: "shopping", name: "Shopping", icon: "🛍️" },
  { id: "fun", name: "Fun", icon: "✨" },
  { id: "other", name: "Other", icon: "…" },
];

const storageKey = "balance-state";

const budgetAmount = document.getElementById("budget-amount");
const balanceLeft = document.getElementById("balance-left");
const resetLabel = document.getElementById("reset-label");
const balanceRing = document.getElementById("balance-ring");
const recentExpenses = document.getElementById("recent-expenses");
const expenseAmount = document.getElementById("expense-amount");
const expenseAmountReview = document.getElementById("expense-amount-review");
const expenseAmountFinal = document.getElementById("expense-amount-final");
const expenseTitle = document.getElementById("expense-title");
const expenseDescription = document.getElementById("expense-description");
const categoryChips = document.getElementById("category-chips");

const formatMoney = (value) => Number(value || 0).toLocaleString("he-IL", { minimumFractionDigits: 0 });

const saveState = () => {
  localStorage.setItem(storageKey, JSON.stringify({
    period: state.period,
    budget: state.budget,
    expenses: state.expenses,
  }));
};

const loadState = () => {
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    state.period = parsed.period || state.period;
    state.budget = parsed.budget || state.budget;
    state.expenses = parsed.expenses || state.expenses;
  } catch (error) {
    console.warn("Failed to load state", error);
  }
};

const showView = (name) => {
  views.forEach((view) => {
    view.hidden = view.dataset.view !== name;
  });
};

const updatePeriodSelection = (period) => {
  state.period = period;
  document.querySelectorAll("[data-period]").forEach((button) => {
    const selected = button.dataset.period === period;
    button.setAttribute("aria-checked", selected ? "true" : "false");
  });
};

const updateBudgetDisplay = () => {
  budgetAmount.textContent = formatMoney(state.budget);
};

const updateBalance = () => {
  const spent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const left = Math.max(state.budget - spent, 0);
  balanceLeft.textContent = formatMoney(left);
  const percent = state.budget > 0 ? Math.min(spent / state.budget, 1) : 0;
  const degrees = Math.round(percent * 360);
  balanceRing.style.background = `conic-gradient(var(--accent) ${degrees}deg, #e9eef5 ${degrees}deg)`;
  resetLabel.textContent = state.period === "weekly" ? "Resets in 3d 4h" : state.period === "monthly" ? "Resets in 12d 2h" : "Resets in 8h 46m";
};

const renderExpenses = () => {
  if (state.expenses.length === 0) {
    recentExpenses.classList.add("empty");
    recentExpenses.innerHTML = "<p>No expenses yet</p><span>Tap \"Add expense\" to get started</span>";
    return;
  }

  recentExpenses.classList.remove("empty");
  recentExpenses.innerHTML = "";
  state.expenses.slice(-3).reverse().forEach((expense) => {
    const category = categories.find((item) => item.id === expense.categoryId);
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
    categoryId: "food",
  };
  expenseTitle.value = "";
  expenseDescription.value = "";
  updateExpenseAmounts();
  renderCategoryChips();
};

const renderCategoryChips = () => {
  categoryChips.innerHTML = "";
  categories.forEach((category) => {
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

const addExpense = () => {
  const amountNumber = Number(state.expenseDraft.amount || 0);
  if (!amountNumber) {
    return;
  }
  state.expenses.push({
    id: crypto.randomUUID(),
    amount: amountNumber,
    categoryId: state.expenseDraft.categoryId,
    title: state.expenseDraft.title,
    description: state.expenseDraft.description,
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  });
  saveState();
  resetDraft();
  updateBalance();
  renderExpenses();
};

const updateFromStorage = () => {
  loadState();
  updatePeriodSelection(state.period);
  updateBudgetDisplay();
  updateBalance();
  renderExpenses();
  renderCategoryChips();
  if (state.budget > 0) {
    showView("home");
  }
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

const registerEvents = () => {
  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => updatePeriodSelection(button.dataset.period));
  });

  document.querySelector("[data-action='to-budget']").addEventListener("click", () => {
    showView("budget");
  });

  document.querySelector("[data-action='back-to-period']").addEventListener("click", () => {
    showView("period");
  });

  document.querySelectorAll("[data-budget]").forEach((button) => {
    button.addEventListener("click", () => {
      state.budget = Number(button.dataset.budget);
      updateBudgetDisplay();
    });
  });

  document.querySelector("[data-action='start']").addEventListener("click", () => {
    if (!state.budget) {
      return;
    }
    saveState();
    updateBalance();
    showView("home");
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
    addExpense();
    showView("home");
  });

  document.querySelectorAll("[data-key]").forEach((button) => {
    button.addEventListener("click", () => handleKeypad(button.dataset.key));
  });
};

updateFromStorage();
registerEvents();
updateExpenseAmounts();
