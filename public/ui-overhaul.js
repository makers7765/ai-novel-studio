/* Rebuild the writing workspace without replacing any existing feature logic. */
(() => {
  const page = document.getElementById("page-studio");
  if (!page || page.dataset.layoutRebuilt === "true") return;
  const free = document.getElementById("freeStudio");
  const legacyGrid = page.querySelector(":scope > .grid:has(#taskFields)");
  if (!free || !legacyGrid) return;
  const formPanel = legacyGrid.querySelector(":scope > .panel:first-child");
  const outputPanel = legacyGrid.querySelector(":scope > .panel:last-child");
  const taskEntry = page.querySelector(":scope > .task-entry-panel");
  const refs = page.querySelector(":scope > .studio-reference");
  const context = page.querySelector(":scope > .context-panel");
  if (!formPanel || !outputPanel) return;

  const desk = document.createElement("div");
  desk.className = "studio-workspace";
  const controls = document.createElement("div");
  controls.className = "studio-controls";
  const result = document.createElement("div");
  result.className = "studio-result";
  const advanced = document.createElement("details");
  advanced.className = "professional-drawer";
  const summary = document.createElement("summary");
  summary.innerHTML = '<span><b>专业创作任务</b><small>八项任务、结构化提示词与高级生成设置</small></span><span class="drawer-indicator">展开设置　＋</span>';
  const advancedBody = document.createElement("div");
  advancedBody.className = "professional-content";
  advanced.append(summary, advancedBody);

  desk.append(controls, result);
  controls.append(free, advanced);
  if (taskEntry) advancedBody.append(taskEntry);
  advancedBody.append(formPanel);
  result.append(outputPanel);
  if (refs || context) {
    const support = document.createElement("details");
    support.className = "studio-support";
    const supportSummary = document.createElement("summary");
    supportSummary.textContent = "小说资料与 AI 上下文";
    const supportBody = document.createElement("div");
    supportBody.className = "studio-support-body";
    if (refs) supportBody.append(refs);
    if (context) supportBody.append(context);
    support.append(supportSummary, supportBody);
    controls.append(support);
  }
  legacyGrid.remove();
  page.querySelectorAll(":scope > [data-workflow-task]").forEach(el => el.remove());
  const workflowWrap = page.querySelector(":scope > .workflow-wrap");
  if (workflowWrap) workflowWrap.remove();
  const notice = page.querySelector(":scope > .notice");
  if (notice) page.insertBefore(desk, notice);
  else page.append(desk);
  page.dataset.layoutRebuilt = "true";

  advanced.addEventListener("toggle", () => {
    const indicator = summary.querySelector(".drawer-indicator");
    if (indicator) indicator.textContent = advanced.open ? "收起设置　−" : "展开设置　＋";
  });
  advancedBody.addEventListener("click", event => {
    if (event.target.closest("[data-task]")) advanced.open = true;
  });
})();
