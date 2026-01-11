import { calculateBalance, createMockApi, createStorage, filterExpensesByPeriod } from "./storage.js";

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
    timestamp: "",
  },
  expenseFilters: {
    search: "",
    categoryId: "all",
    period: "all",
  },
  selectedExpenseId: null,
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
const settingsBudgetInput = document.getElementById("settings-budget");
const alertsToggle = document.getElementById("alerts-toggle");
const recentExpenses = document.getElementById("recent-expenses");
const expenseForm = document.getElementById("expense-form");
const expenseAmountInput = document.getElementById("expense-amount-input");
const expenseCategorySelect = document.getElementById("expense-category");
const expenseTimestampInput = document.getElementById("expense-timestamp");
const expenseTitle = document.getElementById("expense-title");
const expenseDescription = document.getElementById("expense-description");
const expenseError = document.getElementById("expense-error");
const categoryShortcuts = document.getElementById("category-shortcuts");
const expenseSearchInput = document.getElementById("expense-search");
const expenseFilterCategory = document.getElementById("expense-filter-category");
const expenseFilterPeriod = document.getElementById("expense-filter-period");
const expensesList = document.getElementById("expenses-list");
const periodTotal = document.getElementById("period-total");
const periodCount = document.getElementById("period-count");
const periodAverage = document.getElementById("period-average");
const categorySummary = document.getElementById("category-summary");
const reportDailyAverage = document.getElementById("report-daily-average");
const reportPeriodTotal = document.getElementById("report-period-total");
const reportTopCategory = document.getElementById("report-top-category");
const reportTopShare = document.getElementById("report-top-share");
const reportChart = document.getElementById("report-chart");
const reportNote = document.getElementById("report-note");
const detailCategoryIcon = document.getElementById("detail-category-icon");
const detailCategoryName = document.getElementById("detail-category-name");
const detailTitle = document.getElementById("detail-title");
const detailAmount = document.getElementById("detail-amount");
const detailTimestamp = document.getElementById("detail-timestamp");
const detailDescription = document.getElementById("detail-description");
const detailForm = document.getElementById("detail-form");
const detailAmountInput = document.getElementById("detail-amount-input");
const detailCategorySelect = document.getElementById("detail-category");
const detailTitleInput = document.getElementById("detail-title-input");
const detailDescriptionInput = document.getElementById("detail-description-input");
const detailTimestampInput = document.getElementById("detail-timestamp-input");
const detailError = document.getElementById("detail-error");

const formatMoney = (value) => Number(value || 0).toLocaleString("he-IL", { minimumFractionDigits: 0 });
const formatDateTime = (timestamp) =>
  new Date(timestamp).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });

const normalizeText = (value) => (value || "").toString().toLowerCase().trim();

const getDefaultCategoryId = () => state.categories[0]?.id || "food";

const formatDateTimeLocalValue = (date) => {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

const getDaysInPeriod = (period) => {
  if (period === "weekly") {
    return 7;
  }
  if (period === "monthly") {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  return 1;
};

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
  if (settingsBudgetInput) {
    settingsBudgetInput.value = state.budget ? String(state.budget) : "";
  }
  if (alertsToggle) {
    alertsToggle.checked = false;
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

const resetDraft = () => {
  state.expenseDraft = {
    amount: "",
    title: "",
    description: "",
    categoryId: getDefaultCategoryId(),
    timestamp: "",
  };
  expenseAmountInput.value = "";
  expenseTitle.value = "";
  expenseDescription.value = "";
  expenseCategorySelect.value = state.expenseDraft.categoryId;
  expenseTimestampInput.value = formatDateTimeLocalValue(new Date());
  expenseError.textContent = "";
  renderCategoryShortcuts();
};

const renderCategoryOptions = () => {
  expenseCategorySelect.innerHTML = "";
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.icon} ${category.name}`;
    expenseCategorySelect.appendChild(option);
  });
  expenseCategorySelect.value = state.expenseDraft.categoryId;
};

const renderCategoryShortcuts = () => {
  categoryShortcuts.innerHTML = "";
  state.categories.slice(0, 4).forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shortcut-chip";
    if (category.id === expenseCategorySelect.value) {
      button.classList.add("active");
    }
    button.textContent = `${category.icon} ${category.name}`;
    button.addEventListener("click", () => {
      state.expenseDraft.categoryId = category.id;
      expenseCategorySelect.value = category.id;
      renderCategoryShortcuts();
    });
    categoryShortcuts.appendChild(button);
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
    timestamp: state.expenseDraft.timestamp || Date.now(),
    time: new Date(state.expenseDraft.timestamp || Date.now()).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
  state.expenses = await api.addExpense(expense);
  resetDraft();
  updateBalance();
  renderExpenses();
  renderExpenseList();
  renderReports();
};

const getFilteredExpenses = () => {
  const periodScoped =
    state.expenseFilters.period === "all"
      ? state.expenses
      : filterExpensesByPeriod(state.expenses, state.expenseFilters.period);
  const query = normalizeText(state.expenseFilters.search);
  const searchScoped = query
    ? periodScoped.filter((expense) => {
      const category = state.categories.find((item) => item.id === expense.categoryId);
      const fields = [
        expense.title,
        expense.description,
        category?.name,
      ]
        .map(normalizeText)
        .join(" ");
      return fields.includes(query);
    })
    : periodScoped;
  const categoryScoped =
    state.expenseFilters.categoryId === "all"
      ? searchScoped
      : searchScoped.filter((expense) => expense.categoryId === state.expenseFilters.categoryId);
  return {
    periodScoped,
    searchScoped,
    categoryScoped,
  };
};

const renderExpenseSummaries = () => {
  const { searchScoped } = getFilteredExpenses();
  const total = searchScoped.reduce((sum, expense) => sum + expense.amount, 0);
  const count = searchScoped.length;
  periodTotal.textContent = formatMoney(total);
  periodCount.textContent = formatMoney(count);
  periodAverage.textContent = formatMoney(count ? total / count : 0);

  const totalsByCategory = searchScoped.reduce((acc, expense) => {
    acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
    return acc;
  }, {});

  categorySummary.innerHTML = "";
  if (searchScoped.length === 0) {
    categorySummary.innerHTML = "<p class=\"empty-summary\">אין נתונים להצגה</p>";
    return;
  }

  state.categories.forEach((category) => {
    const totalForCategory = totalsByCategory[category.id];
    if (!totalForCategory) {
      return;
    }
    const row = document.createElement("div");
    row.className = "category-summary-row";
    row.innerHTML = `
      <span>${category.icon} ${category.name}</span>
      <strong>₪${formatMoney(totalForCategory)}</strong>
    `;
    categorySummary.appendChild(row);
  });
};

const getReportTotals = () => {
  const scopedExpenses = filterExpensesByPeriod(state.expenses, state.period);
  if (scopedExpenses.length === 0) {
    const samples = state.categories.slice(0, 4);
    const mockTotals = samples.map((category, index) => ({
      category,
      total: 250 + index * 180,
    }));
    return { totals: mockTotals, hasData: false };
  }
  const totalsByCategory = scopedExpenses.reduce((acc, expense) => {
    acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
    return acc;
  }, {});
  const totals = state.categories
    .map((category) => ({
      category,
      total: totalsByCategory[category.id] || 0,
    }))
    .filter((item) => item.total > 0);
  return { totals, hasData: true };
};

const renderReports = () => {
  if (!reportDailyAverage) {
    return;
  }
  const { totals, hasData } = getReportTotals();
  const totalSpent = totals.reduce((sum, item) => sum + item.total, 0);
  const daysInPeriod = getDaysInPeriod(state.period);
  const dailyAverage = totalSpent / daysInPeriod;
  const sortedTotals = totals.slice().sort((a, b) => b.total - a.total);
  const top = sortedTotals[0];
  const topShare = totalSpent ? Math.round((top?.total / totalSpent) * 100) : 0;

  reportDailyAverage.textContent = formatMoney(dailyAverage);
  reportPeriodTotal.textContent = formatMoney(totalSpent);
  reportTopCategory.textContent = top
    ? `${top.category.icon} ${top.category.name}`
    : "—";
  reportTopShare.textContent = `${topShare}%`;

  reportChart.innerHTML = "";
  if (totals.length === 0) {
    reportChart.innerHTML = "<p class=\"empty-summary\">אין נתונים להצגה</p>";
  } else {
    totals
      .slice()
      .sort((a, b) => b.total - a.total)
      .forEach((item) => {
        const share = totalSpent ? Math.round((item.total / totalSpent) * 100) : 0;
        const row = document.createElement("div");
        row.className = "chart-row";
        row.innerHTML = `
          <span class="chart-label">${item.category.icon} ${item.category.name}</span>
          <div class="chart-bar">
            <div class="chart-fill" style="width: ${share}%"></div>
          </div>
          <span class="chart-value">${share}%</span>
        `;
        reportChart.appendChild(row);
      });
  }

  reportNote.textContent = hasData
    ? "מבוסס על הוצאות בתקופה הנוכחית."
    : "מציגים נתוני דוגמה עד שתוסיפו הוצאות.";
};

const renderExpenseList = () => {
  if (!expensesList) {
    return;
  }
  const { categoryScoped } = getFilteredExpenses();
  if (categoryScoped.length === 0) {
    expensesList.classList.add("empty");
    expensesList.innerHTML = "<p>לא נמצאו הוצאות</p><span>נסו לשנות את הסינון או החיפוש</span>";
    renderExpenseSummaries();
    return;
  }
  expensesList.classList.remove("empty");
  expensesList.innerHTML = "";
  categoryScoped
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((expense) => {
      const category = state.categories.find((item) => item.id === expense.categoryId);
      const item = document.createElement("div");
      item.className = "expense-item detailed";
      item.innerHTML = `
        <div class="expense-meta">
          <div class="category-icon">${category?.icon || "💸"}</div>
          <div>
            <strong>${expense.title || category?.name || "Expense"}</strong>
            <div class="subtitle">${category?.name || ""} · ${formatDateTime(expense.timestamp)}</div>
            ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ""}
          </div>
        </div>
        <div class="expense-actions">
          <strong>₪${formatMoney(expense.amount)}</strong>
          <button class="ghost small" data-action="view-expense" data-id="${expense.id}">
            לפרטים
          </button>
        </div>
      `;
      expensesList.appendChild(item);
    });
  renderExpenseSummaries();
};

const renderExpenseFilters = () => {
  expenseFilterCategory.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "כל הקטגוריות";
  expenseFilterCategory.appendChild(allOption);
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.icon} ${category.name}`;
    expenseFilterCategory.appendChild(option);
  });
  expenseFilterCategory.value = state.expenseFilters.categoryId;
  expenseFilterPeriod.value = state.expenseFilters.period;
  expenseSearchInput.value = state.expenseFilters.search;
};

const renderDetailCategoryOptions = (selectedId) => {
  detailCategorySelect.innerHTML = "";
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.icon} ${category.name}`;
    detailCategorySelect.appendChild(option);
  });
  detailCategorySelect.value = selectedId || getDefaultCategoryId();
};

const setDetailFormValues = (expense) => {
  detailAmountInput.value = expense.amount ? String(expense.amount) : "";
  detailTitleInput.value = expense.title || "";
  detailDescriptionInput.value = expense.description || "";
  detailTimestampInput.value = expense.timestamp
    ? formatDateTimeLocalValue(new Date(expense.timestamp))
    : formatDateTimeLocalValue(new Date());
  renderDetailCategoryOptions(expense.categoryId);
  detailError.textContent = "";
};

const renderExpenseDetail = () => {
  const expense = state.expenses.find((item) => item.id === state.selectedExpenseId);
  if (!expense) {
    return;
  }
  const category = state.categories.find((item) => item.id === expense.categoryId);
  detailCategoryIcon.textContent = category?.icon || "💸";
  detailCategoryName.textContent = category?.name || "קטגוריה";
  detailTitle.textContent = expense.title || "הוצאה";
  detailAmount.textContent = formatMoney(expense.amount);
  detailTimestamp.textContent = formatDateTime(expense.timestamp);
  detailDescription.textContent = expense.description || "אין תיאור להוצאה זו.";
  setDetailFormValues(expense);
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
  renderCategoryOptions();
  renderCategoryShortcuts();
  renderExpenseFilters();
  renderExpenseList();
  renderReports();
  showView(state.budget > 0 ? "home" : "onboarding");
};

const isExpenseAmountValid = (value) => Number(value) > 0;

const setPeriod = async (period) => {
  state.period = period;
  updatePeriodSelection(period);
  state.settings = await api.updateSettings({ period });
  updateBalance();
  renderReports();
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

const saveSettings = async () => {
  const budgetValue = Number(settingsBudgetInput?.value || 0);
  if (budgetValue > 0) {
    await setBudget(budgetValue);
  }
  showView("home");
};

const resetData = async () => {
  const confirmed = window.confirm("לאפס את כל הנתונים? לא ניתן לשחזר לאחר מכן.");
  if (!confirmed) {
    return;
  }
  await api.clear();
  await updateFromStorage();
};

const handleExpenseSubmit = async (event) => {
  event.preventDefault();
  const amountValue = expenseAmountInput.value;
  if (!isExpenseAmountValid(amountValue)) {
    expenseError.textContent = "Please enter a positive amount.";
    expenseAmountInput.focus();
    return;
  }
  state.expenseDraft.amount = amountValue;
  state.expenseDraft.title = expenseTitle.value.trim();
  state.expenseDraft.description = expenseDescription.value.trim();
  state.expenseDraft.categoryId = expenseCategorySelect.value;
  state.expenseDraft.timestamp = expenseTimestampInput.value
    ? new Date(expenseTimestampInput.value).getTime()
    : Date.now();
  await addExpense();
  showView("home");
};

const handleDetailSubmit = async (event) => {
  event.preventDefault();
  if (!state.selectedExpenseId) {
    return;
  }
  const amountValue = detailAmountInput.value;
  if (!isExpenseAmountValid(amountValue)) {
    detailError.textContent = "Please enter a positive amount.";
    detailAmountInput.focus();
    return;
  }
  const timestamp = detailTimestampInput.value
    ? new Date(detailTimestampInput.value).getTime()
    : Date.now();
  const updates = {
    amount: Number(amountValue),
    categoryId: detailCategorySelect.value,
    title: detailTitleInput.value.trim(),
    description: detailDescriptionInput.value.trim(),
    timestamp,
    time: new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
  state.expenses = await api.updateExpense(state.selectedExpenseId, updates);
  updateBalance();
  renderExpenses();
  renderExpenseList();
  renderExpenseDetail();
  renderReports();
  showView("expenses");
};

const handleDetailDelete = async () => {
  if (!state.selectedExpenseId) {
    return;
  }
  const expense = state.expenses.find((item) => item.id === state.selectedExpenseId);
  if (!expense) {
    return;
  }
  const confirmed = window.confirm("למחוק את ההוצאה הזו? לא ניתן לשחזר אותה.");
  if (!confirmed) {
    return;
  }
  state.expenses = await api.deleteExpense(expense.id);
  updateBalance();
  renderExpenses();
  renderExpenseList();
  renderReports();
  showView("expenses");
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
    showView("expense");
  });

  document.querySelector("[data-action='view-expenses']").addEventListener("click", () => {
    renderExpenseList();
    showView("expenses");
  });

  document.querySelector("[data-action='view-reports']").addEventListener("click", () => {
    renderReports();
    showView("reports");
  });

  document.querySelectorAll("[data-action='back-home']").forEach((button) => {
    button.addEventListener("click", () => {
      showView("home");
    });
  });

  document.querySelectorAll("[data-action='back-expenses']").forEach((button) => {
    button.addEventListener("click", () => {
      renderExpenseList();
      showView("expenses");
    });
  });

  document.querySelectorAll("[data-action='cancel-expense']").forEach((button) => {
    button.addEventListener("click", () => {
      showView("home");
    });
  });

  document.querySelector("[data-action='open-settings']").addEventListener("click", () => {
    showView("settings");
  });

  document.querySelector("[data-action='save-settings']").addEventListener("click", () => {
    void saveSettings();
  });

  document.querySelector("[data-action='reset-data']").addEventListener("click", () => {
    void resetData();
  });

  expenseCategorySelect.addEventListener("change", () => {
    state.expenseDraft.categoryId = expenseCategorySelect.value;
    renderCategoryShortcuts();
  });

  expenseAmountInput.addEventListener("input", () => {
    if (expenseError.textContent) {
      expenseError.textContent = "";
    }
  });

  detailAmountInput.addEventListener("input", () => {
    if (detailError.textContent) {
      detailError.textContent = "";
    }
  });

  expenseSearchInput.addEventListener("input", () => {
    state.expenseFilters.search = expenseSearchInput.value;
    renderExpenseList();
  });

  expenseFilterCategory.addEventListener("change", () => {
    state.expenseFilters.categoryId = expenseFilterCategory.value;
    renderExpenseList();
  });

  expenseFilterPeriod.addEventListener("change", () => {
    state.expenseFilters.period = expenseFilterPeriod.value;
    renderExpenseList();
  });

  expensesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='view-expense']");
    if (!button) {
      return;
    }
    state.selectedExpenseId = button.dataset.id;
    renderExpenseDetail();
    showView("expense-detail");
  });

  expenseForm.addEventListener("submit", (event) => {
    void handleExpenseSubmit(event);
  });

  detailForm.addEventListener("submit", (event) => {
    void handleDetailSubmit(event);
  });

  document.querySelector("[data-action='delete-expense']").addEventListener("click", () => {
    void handleDetailDelete();
  });
};

const init = async () => {
  await updateFromStorage();
  registerEvents();
};

void init();
