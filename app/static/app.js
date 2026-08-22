const number = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const validDomains = new Set(["portfolio", "flow", "reliability", "activity", "evidence"]);

const byId = id => document.getElementById(id);
const setText = (id, value) => { byId(id).textContent = value; };
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
};

let dashboard = null;

const domainMeta = {
  portfolio: {
    number: "01",
    title: "Portfolio reach",
    kicker: "Reach and distribution · rolling seven days",
    description: "Which project contexts are active, how work is distributed, and which projects entered or left the current observation window.",
  },
  flow: {
    number: "02",
    title: "Request flow",
    kicker: "Throughput · request-time cohort",
    description: "How requested turns move over time, how the current seven-day window compares with the preceding window, and where that volume sits.",
  },
  reliability: {
    number: "03",
    title: "Request outcomes",
    kicker: "Reliability · terminal request cohort",
    description: "Completed, error, and interrupted terminal states remain separate from nonterminal turns so the denominator stays explicit.",
  },
  activity: {
    number: "04",
    title: "Agent activity",
    kicker: "Operations · occurrences per one hundred turns",
    description: "Tool, planning, checkpoint, compaction, and runtime events describe system behavior. They are never treated as a score for people or productivity.",
  },
  evidence: {
    number: "05",
    title: "Evidence quality",
    kicker: "Coverage, freshness, and contract limits",
    description: "How much admitted activity resolves to an exact projected turn, how fresh the snapshot is, and what these aggregates can and cannot support.",
  },
};

async function loadDashboard() {
  setStatus("Refreshing aggregate", "loading");
  try {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) throw new Error(`dashboard returned ${response.status}`);
    dashboard = await response.json();
    renderAtlas();
    route();
    const aligned = dashboard.snapshot.projectionLag === 0;
    setStatus(aligned ? "Projection aligned" : `${number.format(dashboard.snapshot.projectionLag)} events behind`, aligned ? "aligned" : "loading");
    setText("snapshot-time", `Generated ${formatTime(dashboard.snapshot.generatedAt)}`);
  } catch (error) {
    console.error(error);
    setStatus("Snapshot unavailable", "unavailable");
    showError("The aggregate snapshot is unavailable.", "The service could not supply an admitted analytical view. Refresh after the source recovers.");
  }
}

function setStatus(label, state) {
  setText("status-label", label);
  byId("status-dot").className = `status-dot ${state}`;
}

function renderAtlas() {
  const { summary, activityCoverage, daily, activity, snapshot } = dashboard;
  const terminal = terminalCount(summary);
  const attribution = share(activityCoverage.attributedToTurn, activityCoverage.total);

  setText("atlas-active-projects", number.format(summary.activeProjects7d));
  setText("atlas-active-context", `${number.format(summary.activeProjects24h)} in the past 24 hours · ${number.format(summary.currentProjects)} current`);
  setText("atlas-turns", number.format(summary.turnsRequested));
  setText("atlas-turns-context", comparisonLabel(summary.turnsRequested, summary.turnsPrevious));
  setText("atlas-completion", formatPercent(summary.terminalCompletionRate));
  setText("atlas-completion-context", `${number.format(terminal)} terminal turns · ${number.format(summary.turnsInFlight)} nonterminal`);
  setText("atlas-attribution", formatPercent(attribution));
  setText("atlas-attribution-context", `${number.format(activityCoverage.attributedToTurn)} of ${number.format(activityCoverage.total)} admitted occurrences`);

  renderLineChart("atlas-chart", daily, "turnsRequested", "atlas-range-start", "atlas-range-end", "atlas-chart-peak");
  renderDataTable("atlas-chart-data", ["UTC date", "Requested turns", "Active projects", "Active threads"], daily.map(row => [formatDay(row.day), number.format(row.turnsRequested), number.format(row.activeProjects), number.format(row.activeThreads)]), "Daily portfolio request flow");
  renderAttention();

  renderInlineFacts("atlas-portfolio-facts", [
    `${number.format(summary.currentOnlyProjects)} current-window only`,
    `${number.format(summary.coolingProjects)} quiet in current window`,
    `${formatPercent(summary.topThreeTurnShare)} in top three`,
  ]);
  renderInlineFacts("atlas-flow-facts", [
    `${number.format(summary.turnsPrevious)} turns prior window`,
    `${number.format(summary.activeThreads)} active threads`,
  ]);
  renderInlineFacts("atlas-reliability-facts", [
    `${number.format(summary.turnsError)} error`,
    `${number.format(summary.turnsInterrupted)} interrupted`,
    `${number.format(summary.turnsInFlight)} nonterminal`,
  ]);
  renderInlineFacts("atlas-activity-facts", activity.slice(0, 3).map(item => `${activityLabel(item.kind)} ${formatRate(item.perHundredTurns)}`));
  renderInlineFacts("atlas-evidence-facts", [
    `${number.format(snapshot.projectionLag)} projection lag`,
    `${formatDuration(snapshot.sourceFreshnessSeconds)} source freshness`,
    `${number.format(activityCoverage.unresolvedTurn)} unresolved`,
  ]);
}

function renderAttention() {
  const { summary, activityCoverage } = dashboard;
  const items = [
    [summary.turnsError, "Error outcomes", `${number.format(summary.turnsError)} requested turns reached an error state`, "#domain/reliability"],
    [summary.turnsInterrupted, "Interrupted outcomes", `${number.format(summary.turnsInterrupted)} requested turns were interrupted`, "#domain/reliability"],
    [activityCoverage.unresolvedTurn, "Unresolved attribution", `${number.format(activityCoverage.unresolvedTurn)} activity occurrences reference an unresolved turn`, "#domain/evidence"],
    [summary.turnsInFlight, "Nonterminal turns", `${number.format(summary.turnsInFlight)} requested turns have no terminal state`, "#domain/reliability"],
    [summary.dormantProjects30d, "Dormant projects", `${number.format(summary.dormantProjects30d)} current projects have no work within thirty days`, "#domain/portfolio"],
  ].filter(item => item[0] > 0).slice(0, 5);

  const target = byId("attention-list");
  target.replaceChildren();
  if (!items.length) {
    target.append(node("p", "empty-row", "No observed watchlist conditions in this snapshot."));
    return;
  }
  items.forEach((item, index) => {
    const link = node("a", "attention-item");
    link.href = item[3];
    const indexNode = node("span", "", String(index + 1).padStart(2, "0"));
    const copy = node("div");
    copy.append(node("strong", "", item[1]), node("small", "", item[2]));
    link.append(indexNode, copy, node("em", "", "→"));
    target.append(link);
  });
}

function renderInlineFacts(id, facts) {
  const target = byId(id);
  target.replaceChildren(...facts.map(fact => node("span", "", fact)));
}

function route() {
  if (!dashboard) return;
  const parsed = parseRoute();
  document.querySelectorAll(".view").forEach(view => { view.hidden = true; });
  document.querySelectorAll("[data-nav]").forEach(link => link.classList.remove("active"));

  if (parsed.kind === "atlas") {
    byId("view-atlas").hidden = false;
    activateNav("atlas");
    document.title = "T3Code Field Atlas";
  } else if (parsed.kind === "domain" && validDomains.has(parsed.domain)) {
    byId("view-domain").hidden = false;
    activateNav(parsed.domain);
    renderDomain(parsed.domain);
  } else if (parsed.kind === "project") {
    const project = dashboard.projects.find(item => item.key === parsed.key);
    if (project) {
      byId("view-project").hidden = false;
      activateNav(parsed.from);
      renderProject(project, parsed.from);
    } else {
      showError("That project is not in this snapshot.", "The project key may have expired or the current aggregate may no longer admit it.");
    }
  } else if (parsed.kind === "project-evidence") {
    const project = dashboard.projects.find(item => item.key === parsed.key);
    if (project) {
      byId("view-evidence").hidden = false;
      activateNav("evidence");
      renderProjectEvidence(project, parsed.from);
    } else {
      showError("That evidence ledger is not available.", "Return to the atlas and choose a project from the current snapshot.");
    }
  } else {
    showError("That route is not available.", "Return to the atlas to choose an admitted analytical view.");
  }
  window.scrollTo({ top: 0, behavior: "auto" });
}

function parseRoute() {
  const raw = (window.location.hash || "#atlas").slice(1);
  const split = raw.indexOf("?");
  const path = split >= 0 ? raw.slice(0, split) : raw;
  const params = new URLSearchParams(split >= 0 ? raw.slice(split + 1) : "");
  const parts = path.split("/");
  const from = validDomains.has(params.get("from")) ? params.get("from") : "portfolio";
  if (!path || path === "atlas" || path === "overview") return { kind: "atlas" };
  if (parts[0] === "domain" && parts.length === 2) return { kind: "domain", domain: parts[1] };
  if (parts[0] === "project" && parts.length === 2) return { kind: "project", key: decodeURIComponent(parts[1]), from };
  if (parts[0] === "project" && parts.length === 3 && parts[2] === "evidence") return { kind: "project-evidence", key: decodeURIComponent(parts[1]), from };
  return { kind: "invalid" };
}

function activateNav(name) {
  const target = document.querySelector(`[data-nav="${validDomains.has(name) ? name : "atlas"}"]`);
  if (target) target.classList.add("active");
}

function showError(title, note) {
  document.querySelectorAll(".view").forEach(view => { view.hidden = true; });
  byId("view-error").hidden = false;
  setText("error-title", title);
  setText("error-note", note);
  document.title = "Unavailable view · T3Code Field Atlas";
}

function renderDomain(domain) {
  const meta = domainMeta[domain];
  setText("domain-crumb", meta.title);
  setText("domain-kicker", meta.kicker);
  setText("domain-title", meta.title);
  setText("domain-description", meta.description);
  const target = byId("domain-content");
  target.replaceChildren();
  if (domain === "portfolio") renderPortfolioDomain(target);
  if (domain === "flow") renderFlowDomain(target);
  if (domain === "reliability") renderReliabilityDomain(target);
  if (domain === "activity") renderActivityDomain(target);
  if (domain === "evidence") renderEvidenceDomain(target);
  document.title = `${meta.title} · T3Code Field Atlas`;
}

function renderPortfolioDomain(target) {
  const { summary, projects } = dashboard;
  target.append(metricRibbon([
    ["Active projects", number.format(summary.activeProjects7d), `${number.format(summary.activeProjects24h)} in the past 24 hours`, true],
    ["Current projects", number.format(summary.currentProjects), "Projected current work contexts"],
    ["Top three share", formatPercent(summary.topThreeTurnShare), "Share of current-window requested turns"],
    ["Dormant beyond 30d", number.format(summary.dormantProjects30d), "Current projects without recent work"],
  ]));

  const grid = node("section", "analysis-grid");
  const distribution = panel("Project distribution", "Requested turns · rolling seven days", "analysis-panel");
  const ranked = [...projects].sort((a, b) => b.turns7d - a.turns7d).slice(0, 10);
  distribution.body.append(barList(ranked.map(project => ({ label: project.title, value: project.turns7d, display: number.format(project.turns7d) }))));
  const movement = panel("Window movement", "Direct observations", "side-panel");
  movement.body.append(factList([
    ["Current-window only", number.format(summary.currentOnlyProjects), "Active now and quiet in the preceding seven days. This does not mean newly created."],
    ["Quiet now", number.format(summary.coolingProjects), "Active in the preceding window and quiet in the current window."],
    ["Active threads", number.format(summary.activeThreads), "Distinct threads with a requested turn in the current window."],
    ["Actionable plans", number.format(summary.actionablePlanThreads), "Current threads with admitted actionable-plan state."],
  ]));
  grid.append(distribution.element, movement.element);
  target.append(grid, projectTablePanel(projects, "portfolio"));
}

function renderFlowDomain(target) {
  const { summary, daily, projects } = dashboard;
  const delta = summary.turnsRequested - summary.turnsPrevious;
  target.append(metricRibbon([
    ["Requested turns", number.format(summary.turnsRequested), "Current seven-day request cohort", true],
    ["Preceding window", number.format(summary.turnsPrevious), "Immediately preceding seven days"],
    ["Absolute change", signedNumber(delta), "Current minus preceding window"],
    ["Active threads", number.format(summary.activeThreads), "Threads with a requested turn"],
  ]));
  const grid = node("section", "analysis-grid");
  const trend = panel("Daily request flow", "Forty-two day trace", "analysis-panel");
  const chart = node("div", "chart chart-large"); chart.id = "flow-chart"; chart.setAttribute("role", "img"); chart.setAttribute("aria-label", "Daily requested turns");
  const footer = chartFooter("flow-range-start", "flow-chart-peak", "flow-range-end");
  const details = dataDisclosure("flow-chart-data");
  trend.body.append(chart, footer, details);
  const context = panel("Window comparison", "No qualitative threshold", "side-panel");
  context.body.append(factList([
    ["Current", number.format(summary.turnsRequested), "Requested turns in the rolling seven-day window."],
    ["Preceding", number.format(summary.turnsPrevious), "Requested turns in the immediately preceding window."],
    ["Difference", signedNumber(delta), comparisonLabel(summary.turnsRequested, summary.turnsPrevious)],
    ["Daily peak", number.format(Math.max(...daily.map(row => row.turnsRequested), 0)), "Highest observed daily count in the displayed trace."],
  ]));
  grid.append(trend.element, context.element);
  target.append(grid);
  renderLineChart("flow-chart", daily, "turnsRequested", "flow-range-start", "flow-range-end", "flow-chart-peak");
  renderDataTable("flow-chart-data", ["UTC date", "Requested turns", "Completed", "Error", "Interrupted"], daily.map(row => [formatDay(row.day), number.format(row.turnsRequested), number.format(row.turnsCompleted), number.format(row.turnsError), number.format(row.turnsInterrupted)]), "Daily request and outcome counts");
  target.append(projectTablePanel([...projects].sort((a, b) => b.turns7d - a.turns7d), "flow", "Projects carrying current flow"));
}

function renderReliabilityDomain(target) {
  const { summary, daily, projects } = dashboard;
  const terminal = terminalCount(summary);
  target.append(metricRibbon([
    ["Terminal completion", formatPercent(summary.terminalCompletionRate), `${number.format(terminal)} terminal turns`, true],
    ["Error", number.format(summary.turnsError), "Terminal request state"],
    ["Interrupted", number.format(summary.turnsInterrupted), "Terminal request state"],
    ["Nonterminal", number.format(summary.turnsInFlight), "Current source state, excluded from rate"],
  ]));
  const grid = node("section", "analysis-grid");
  const outcomes = panel("Terminal outcome composition", "Current request cohort", "analysis-panel");
  outcomes.body.append(stackBar([
    [summary.turnsCompleted, terminal, "complete", "Completed"],
    [summary.turnsError, terminal, "error", "Error"],
    [summary.turnsInterrupted, terminal, "interrupted", "Interrupted"],
  ]), legend([
    ["complete", `${number.format(summary.turnsCompleted)} completed`],
    ["error", `${number.format(summary.turnsError)} error`],
    ["interrupted", `${number.format(summary.turnsInterrupted)} interrupted`],
  ]));
  const exceptions = panel("Denominator", "What the rate includes", "side-panel");
  exceptions.body.append(factList([
    ["Completed", number.format(summary.turnsCompleted), "Included in the terminal denominator."],
    ["Error", number.format(summary.turnsError), "Included in the terminal denominator."],
    ["Interrupted", number.format(summary.turnsInterrupted), "Included in the terminal denominator."],
    ["Nonterminal", number.format(summary.turnsInFlight), "Reported separately and excluded from terminal completion."],
  ]));
  grid.append(outcomes.element, exceptions.element);
  target.append(grid);

  const trace = panel("Outcome exceptions over time", "Daily error and interruption counts", "full-panel");
  const chart = node("div", "chart chart-large"); chart.id = "reliability-chart"; chart.setAttribute("role", "img"); chart.setAttribute("aria-label", "Daily errors and interruptions");
  const details = dataDisclosure("reliability-chart-data");
  trace.body.append(chart, details);
  target.append(trace.element);
  renderOutcomeChart("reliability-chart", daily);
  renderDataTable("reliability-chart-data", ["UTC date", "Completed", "Error", "Interrupted", "Requested"], daily.map(row => [formatDay(row.day), number.format(row.turnsCompleted), number.format(row.turnsError), number.format(row.turnsInterrupted), number.format(row.turnsRequested)]), "Daily request outcomes");
  const exceptionProjects = [...projects].filter(project => project.turnsError7d + project.turnsInterrupted7d + project.turnsInFlight > 0).sort((a, b) => b.turnsError7d + b.turnsInterrupted7d - a.turnsError7d - a.turnsInterrupted7d);
  target.append(projectTablePanel(exceptionProjects, "reliability", "Projects with current outcome exceptions"));
}

function renderActivityDomain(target) {
  const recent = dashboard.daily.slice(-dashboard.snapshot.windowDays);
  const sums = aggregateDaily(recent);
  target.append(metricRibbon([
    ["Tool starts", number.format(sums.toolStarts), "Occurrences in the current window", true],
    ["Tool completions", number.format(sums.toolCompletions), "Occurrences in the current window"],
    ["Plan updates", number.format(sums.planUpdates), "Occurrences in the current window"],
    ["Runtime errors", number.format(sums.runtimeErrors), "Occurrences in the current window"],
  ]));
  const grid = node("section", "analysis-grid");
  const rates = panel("Activity rate", "Occurrences per one hundred requested turns", "analysis-panel");
  rates.body.append(barList(dashboard.activity.map(item => ({ label: activityLabel(item.kind), value: item.perHundredTurns, display: formatRate(item.perHundredTurns) }))));
  const totals = panel("Current-window counts", "Raw admitted occurrences", "side-panel");
  totals.body.append(factList([
    ["Checkpoints", number.format(sums.checkpoints), "Aggregate system events."],
    ["Compactions", number.format(sums.compactions), "Aggregate system events."],
    ["Runtime errors", number.format(sums.runtimeErrors), "Runtime-error activity events, separate from turn outcome."],
    ["Requested turns", number.format(dashboard.summary.turnsRequested), "Denominator used for per-one-hundred rates."],
  ]));
  grid.append(rates.element, totals.element);
  target.append(grid, projectTablePanel([...dashboard.projects].sort((a, b) => activityTotal(b) - activityTotal(a)), "activity", "Project activity context"));
}

function renderEvidenceDomain(target) {
  const { snapshot, activityCoverage, projects } = dashboard;
  const attribution = share(activityCoverage.attributedToTurn, activityCoverage.total);
  target.append(metricRibbon([
    ["Turn attribution", formatPercent(attribution), `${number.format(activityCoverage.attributedToTurn)} of ${number.format(activityCoverage.total)} occurrences`, true],
    ["Projection lag", number.format(snapshot.projectionLag), "Source sequence minus projection sequence"],
    ["Source freshness", formatDuration(snapshot.sourceFreshnessSeconds), "Age at aggregate generation"],
    ["Contract", `v${number.format(snapshot.contractVersion)}`, `${number.format(snapshot.windowDays)} day current window`],
  ]));
  const grid = node("section", "analysis-grid");
  const coverage = panel("Attribution coverage", "Admitted activity occurrences", "analysis-panel");
  coverage.body.append(stackBar([
    [activityCoverage.attributedToTurn, activityCoverage.total, "attributed", "Turn attributed"],
    [activityCoverage.threadLevel, activityCoverage.total, "thread-level", "Thread level"],
    [activityCoverage.unresolvedTurn, activityCoverage.total, "unresolved", "Unresolved turn"],
  ]), legend([
    ["attributed", `${number.format(activityCoverage.attributedToTurn)} turn attributed`],
    ["thread-level", `${number.format(activityCoverage.threadLevel)} thread level`],
    ["unresolved", `${number.format(activityCoverage.unresolvedTurn)} unresolved turn`],
  ]));
  const source = panel("Snapshot contract", "Operational facts", "side-panel");
  source.body.append(factList([
    ["Generated", formatTime(snapshot.generatedAt), "Aggregate generation time."],
    ["Latest source event", formatTime(snapshot.sourceLatestAt), "Latest admitted source event time."],
    ["Source sequence", number.format(snapshot.sourceEventSequence), "Latest observed source event sequence."],
    ["Projection sequence", number.format(snapshot.projectionSequence), "Latest persisted projection sequence."],
  ]));
  grid.append(coverage.element, source.element);
  target.append(grid, methodCards(), evidenceProjectTable(projects));
}

function renderProject(project, from) {
  setText("project-title", project.title);
  setText("project-crumb", project.title);
  setText("project-last-work", formatTime(project.lastWorkAt));
  setText("project-recency-band", recencyLabel(project.recencyBand));
  const back = byId("project-domain-return");
  back.href = `#domain/${from}`;
  back.textContent = domainMeta[from]?.title || "Portfolio";
  const target = byId("project-content");
  target.replaceChildren();
  const terminal = terminalCount(project, "7d");
  target.append(metricRibbon([
    ["Requested turns", number.format(project.turns7d), comparisonLabel(project.turns7d, project.turnsPrevious), true],
    ["Active threads", number.format(project.activeThreads7d), `${number.format(project.newThreads7d)} first active in this window`],
    ["Portfolio share", formatPercent(project.turnShare7d), "Share of current project-linked turns"],
    ["Terminal completion", formatPercent(project.terminalCompletionRate7d), `${number.format(terminal)} terminal turns`],
  ]));

  const grid = node("section", "analysis-grid");
  const trend = panel("Project request flow", "Forty-two day trace", "analysis-panel");
  const chart = node("div", "chart chart-large"); chart.id = "project-chart"; chart.setAttribute("role", "img"); chart.setAttribute("aria-label", `Daily requested turns for ${project.title}`);
  const footer = chartFooter("project-range-start", "project-chart-peak", "project-range-end");
  const details = dataDisclosure("project-chart-data");
  trend.body.append(chart, footer, details);
  const outcome = panel("Current outcome facts", "Request cohort", "side-panel");
  outcome.body.append(stackBar([
    [project.turnsCompleted7d, terminal, "complete", "Completed"],
    [project.turnsError7d, terminal, "error", "Error"],
    [project.turnsInterrupted7d, terminal, "interrupted", "Interrupted"],
  ]), factList([
    ["Completed", number.format(project.turnsCompleted7d), "Terminal state"],
    ["Error", number.format(project.turnsError7d), "Terminal state"],
    ["Interrupted", number.format(project.turnsInterrupted7d), "Terminal state"],
    ["Nonterminal", number.format(project.turnsInFlight), "Excluded from terminal completion"],
  ]));
  grid.append(trend.element, outcome.element);
  target.append(grid);
  renderLineChart("project-chart", project.daily, "turnsRequested", "project-range-start", "project-range-end", "project-chart-peak");
  renderDataTable("project-chart-data", ["UTC date", "Requested turns", "Active threads"], project.daily.map(row => [formatDay(row.day), number.format(row.turnsRequested), number.format(row.activeThreads)]), `Daily request flow for ${project.title}`);

  const detailGrid = node("section", "analysis-grid");
  const recency = panel("Thread recency", "Current projected threads", "analysis-panel");
  recency.body.append(barList([
    { label: "Within 24 hours", value: project.threadRecency.within24h, display: number.format(project.threadRecency.within24h) },
    { label: "Two to seven days", value: project.threadRecency.within7d, display: number.format(project.threadRecency.within7d) },
    { label: "Eight to thirty days", value: project.threadRecency.within30d, display: number.format(project.threadRecency.within30d) },
    { label: "Beyond thirty days", value: project.threadRecency.beyond30d, display: number.format(project.threadRecency.beyond30d) },
    { label: "Unknown", value: project.threadRecency.unknown, display: number.format(project.threadRecency.unknown) },
  ]));
  const activity = panel("Activity rate", "Occurrences per one hundred turns", "side-panel");
  activity.body.append(barList(project.activity.slice(0, 8).map(item => ({ label: activityLabel(item.kind), value: item.perHundredTurns, display: formatRate(item.perHundredTurns) }))));
  detailGrid.append(recency.element, activity.element);
  target.append(detailGrid, projectEvidenceCallout(project, from));
  document.title = `${project.title} · T3Code Field Atlas`;
}

function renderProjectEvidence(project, from) {
  setText("evidence-title", project.title);
  const back = byId("evidence-project-return");
  back.href = projectHref(project, from);
  back.textContent = project.title;
  const coverage = project.activityCoverage;
  const terminal = terminalCount(project, "7d");
  const rows = [
    ["Last admitted work", formatTime(project.lastWorkAt), "Project snapshot", "Recency only. Not attention duration."],
    ["Requested turns", number.format(project.turns7d), "Project · rolling seven days", "Activity volume. Not productivity."],
    ["Prior requested turns", number.format(project.turnsPrevious), "Project · preceding seven days", "Comparison baseline only."],
    ["Current threads", number.format(project.currentThreads), "Project snapshot", "Projected work objects. Not sessions or people."],
    ["Active threads", number.format(project.activeThreads7d), "Project · rolling seven days", "Threads with a requested turn."],
    ["First active in window", number.format(project.newThreads7d), "Project · rolling seven days", "First observed activity in the window. Not thread creation."],
    ["Completed turns", number.format(project.turnsCompleted7d), "Request cohort · rolling seven days", "Source terminal state."],
    ["Error turns", number.format(project.turnsError7d), "Request cohort · rolling seven days", "Source terminal state."],
    ["Interrupted turns", number.format(project.turnsInterrupted7d), "Request cohort · rolling seven days", "Source terminal state."],
    ["Nonterminal turns", number.format(project.turnsInFlight), "Current source state", "Not equivalent to unfinished human work."],
    ["Terminal completion", terminal ? percent.format(project.turnsCompleted7d / terminal) : "—", "Terminal request cohort", `Completed divided by ${number.format(terminal)} terminal turns. Nonterminal excluded.`],
    ["Turn-attributed activity", number.format(coverage.attributedToTurn), "Admitted activity", "Exact projected-turn association."],
    ["Thread-level activity", number.format(coverage.threadLevel), "Admitted activity", "No exact turn association."],
    ["Unresolved-turn activity", number.format(coverage.unresolvedTurn), "Admitted activity", "Turn reference could not be resolved."],
  ];
  const target = byId("evidence-content");
  target.replaceChildren();
  const tablePanel = panel("Admitted claim ledger", "Values beneath the project view", "full-panel");
  tablePanel.body.append(dataTable(["Claim", "Value", "Grain", "Interpretation limit"], rows, "Exact project evidence"));
  target.append(tablePanel.element, methodCards());
  document.title = `Evidence · ${project.title} · T3Code Field Atlas`;
}

function metricRibbon(metrics) {
  const ribbon = node("section", "metric-ribbon");
  ribbon.setAttribute("aria-label", "Key facts");
  metrics.forEach(([label, value, note, accent]) => {
    const item = node("article", `metric-block${accent ? " accent" : ""}`);
    item.append(node("span", "", label), node("strong", "", value), node("small", "", note));
    ribbon.append(item);
  });
  return ribbon;
}

function panel(title, kicker, className) {
  const element = node("section", `panel ${className}`);
  const heading = node("div", "panel-heading");
  const copy = node("div");
  copy.append(node("p", "kicker", kicker), node("h2", "", title));
  heading.append(copy);
  const body = node("div");
  element.append(heading, body);
  return { element, body, heading };
}

function factList(rows) {
  const list = node("dl", "fact-list");
  rows.forEach(([label, value, note]) => {
    const item = node("div");
    item.append(node("dt", "", label), node("dd", "", value));
    if (note) item.append(node("small", "", note));
    list.append(item);
  });
  return list;
}

function barList(rows) {
  const list = node("div", "bar-list");
  if (!rows.length) {
    list.append(node("p", "empty-row", "No measured values in this window."));
    return list;
  }
  const values = rows.map(row => row.value).filter(value => Number.isFinite(value));
  const max = Math.max(...values, 1);
  rows.forEach(row => {
    const item = node("div", `bar-row ${row.tone || ""}`);
    const track = node("div", "bar-track");
    const fill = node("i");
    fill.style.width = Number.isFinite(row.value) ? `${Math.max(0, row.value) / max * 100}%` : "0";
    track.append(fill);
    item.append(node("span", "", row.label), track, node("b", "", row.display));
    list.append(item);
  });
  return list;
}

function stackBar(parts) {
  const total = parts[0]?.[1] || 0;
  const bar = node("div", `stack-bar${total ? "" : " is-empty"}`);
  const label = parts.map(([value, , , name]) => `${name} ${number.format(value)}`).join(", ");
  bar.setAttribute("aria-label", total ? label : "No measured values");
  parts.forEach(([value, denominator, className, name]) => {
    const segment = node("i", className);
    segment.style.width = denominator ? `${value / denominator * 100}%` : "0";
    segment.title = `${name}: ${number.format(value)}`;
    bar.append(segment);
  });
  return bar;
}

function legend(parts) {
  const list = node("div", "legend-list");
  parts.forEach(([className, label]) => {
    const item = node("span");
    item.append(node("i", className), document.createTextNode(label));
    list.append(item);
  });
  return list;
}

function projectTablePanel(projects, from, title = "Current portfolio") {
  const box = panel(title, "Project navigator", "full-panel");
  const tools = node("div", "table-tools");
  const searchLabel = node("label");
  searchLabel.append(node("span", "", "Find project"));
  const search = node("input"); search.type = "search"; search.placeholder = "Search titles"; search.autocomplete = "off";
  searchLabel.append(search);
  const recencyLabelNode = node("label");
  recencyLabelNode.append(node("span", "", "Recency"));
  const select = node("select");
  [["all", "All recency"], ["within-24h", "Within 24 hours"], ["two-to-seven-days", "Two to seven days"], ["eight-to-thirty-days", "Eight to thirty days"], ["beyond-30d", "Beyond thirty days"], ["unknown", "Unknown"], ["invalid", "Invalid timestamp"]].forEach(([value, label]) => {
    const option = node("option", "", label); option.value = value; select.append(option);
  });
  recencyLabelNode.append(select);
  tools.append(searchLabel, recencyLabelNode);
  box.heading.append(tools);
  const holder = node("div", "table-scroll");
  box.body.append(holder);
  const update = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const visible = projects.filter(project => (!query || project.title.toLocaleLowerCase().includes(query)) && (select.value === "all" || project.recencyBand === select.value));
    holder.replaceChildren(projectTable(visible, from));
  };
  search.addEventListener("input", update);
  select.addEventListener("change", update);
  update();
  return box.element;
}

function projectTable(projects, from) {
  if (!projects.length) return node("p", "empty-row", "No projects match this view.");
  const table = node("table");
  const head = node("thead");
  const row = node("tr");
  ["Project", "Last work", "Turns · 7d", "Share", "vs prior", "Active threads", "Outcome exceptions"].forEach((label, index) => {
    const th = node("th", index > 1 ? "numeric" : "", label); th.scope = "col"; row.append(th);
  });
  head.append(row);
  const body = node("tbody");
  projects.forEach(project => {
    const tr = node("tr");
    const projectCell = node("td");
    const link = node("a", "project-link", project.title); link.href = projectHref(project, from);
    projectCell.append(link, node("small", "", `${number.format(project.currentThreads)} current threads`));
    tr.append(
      projectCell,
      tableCell(formatRelative(project.lastWorkAt)),
      tableCell(number.format(project.turns7d), "numeric"),
      tableCell(formatPercent(project.turnShare7d), "numeric"),
      tableCell(shortComparison(project.turns7d, project.turnsPrevious), "numeric"),
      tableCell(number.format(project.activeThreads7d), "numeric"),
      tableCell(`${number.format(project.turnsError7d)} error · ${number.format(project.turnsInterrupted7d)} interrupted`, "numeric"),
    );
    body.append(tr);
  });
  table.append(head, body);
  return table;
}

function evidenceProjectTable(projects) {
  const box = panel("Project coverage", "Coverage follows the claim", "full-panel");
  const rows = projects.map(project => {
    const coverage = project.activityCoverage;
    return [project.title, formatPercent(share(coverage.attributedToTurn, coverage.total)), number.format(coverage.threadLevel), number.format(coverage.unresolvedTurn), project];
  });
  const table = node("table");
  const head = node("thead"); const headRow = node("tr");
  ["Project", "Turn attributed", "Thread level", "Unresolved", "Ledger"].forEach(label => { const th = node("th", "", label); th.scope = "col"; headRow.append(th); });
  head.append(headRow);
  const body = node("tbody");
  rows.forEach(([title, attributed, threadLevel, unresolved, project]) => {
    const tr = node("tr");
    tr.append(tableCell(title), tableCell(attributed), tableCell(threadLevel), tableCell(unresolved));
    const action = node("td"); const link = node("a", "project-link", "Open evidence →"); link.href = evidenceHref(project, "evidence"); action.append(link); tr.append(action);
    body.append(tr);
  });
  table.append(head, body);
  const holder = node("div", "table-scroll"); holder.append(table); box.body.append(holder);
  return box.element;
}

function projectEvidenceCallout(project, from) {
  const callout = node("aside", "evidence-callout");
  const copy = node("div");
  copy.append(node("strong", "", "Inspect the exact claims behind this project reading"), node("small", "", "Values, grain, denominators, attribution coverage, and interpretation limits."));
  const link = node("a", "", "Open evidence ledger →"); link.href = evidenceHref(project, from);
  callout.append(node("span", "", "EVID"), copy, link);
  return callout;
}

function methodCards() {
  const section = node("section", "method-grid");
  [
    ["01", "Read-only source", "The extractor observes the source database through a read-only connection and persists only privacy-safe aggregates."],
    ["02", "Request-time cohort", "Current and preceding windows group turns by request time. Terminal outcomes belong to that request cohort."],
    ["03", "Explicit nulls", "Missing rates remain unavailable. The interface does not convert missing evidence into zero."],
    ["04", "No productivity inference", "Counts describe system activity, work distribution, and source states. They do not measure people."],
    ["05", "Protected topology", "Paths, raw content, identities, sessions, credentials, and repository relationships never cross the published boundary."],
    ["06", "Coverage attached", "Turn-attributed, thread-level, and unresolved activity remain distinct so evidence quality is visible beside the claim."],
  ].forEach(([mark, title, description]) => {
    const card = node("article", "method-card");
    card.append(node("span", "", mark), node("strong", "", title), node("p", "", description));
    section.append(card);
  });
  return section;
}

function renderLineChart(targetId, rows, field, startId, endId, peakId) {
  const target = byId(targetId);
  target.replaceChildren();
  if (!rows.length) { target.append(node("p", "empty-row", "No measured days in this window.")); return; }
  const width = 1200; const height = 310; const pad = 16;
  const max = Math.max(...rows.map(row => row[field]), 1);
  const points = rows.map((row, index) => chartPoint(index, row[field], rows.length, max, width, height, pad));
  const areaPoints = [`0,${height}`, ...points, `${width},${height}`].join(" ");
  const gradientId = `${targetId}-area-fill`;
  const grid = [0.25, 0.5, 0.75].map(value => `<line x1="0" x2="${width}" y1="${height * value}" y2="${height * value}" />`).join("");
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9ff53" stop-opacity="0.24"/><stop offset="1" stop-color="#d9ff53" stop-opacity="0.01"/></linearGradient></defs><g class="grid">${grid}</g><polygon class="area" fill="url(#${gradientId})" points="${areaPoints}"/><polyline class="line" points="${points.join(" ")}"/></svg>`;
  setText(startId, formatDay(rows[0].day));
  setText(endId, formatDay(rows.at(-1).day));
  setText(peakId, `Peak ${number.format(max)} daily turns`);
}

function renderOutcomeChart(targetId, rows) {
  const target = byId(targetId);
  target.replaceChildren();
  if (!rows.length) { target.append(node("p", "empty-row", "No measured days in this window.")); return; }
  const width = 1200; const height = 310; const barWidth = width / rows.length;
  const max = Math.max(...rows.map(row => row.turnsError + row.turnsInterrupted), 1);
  const bars = rows.map((row, index) => {
    const errorHeight = row.turnsError / max * (height - 24);
    const interruptedHeight = row.turnsInterrupted / max * (height - 24);
    const x = index * barWidth + barWidth * 0.15;
    const w = Math.max(barWidth * 0.7, 1);
    return `<rect class="bar-error" x="${x}" y="${height - errorHeight}" width="${w}" height="${errorHeight}"/><rect class="bar-interrupted" x="${x}" y="${height - errorHeight - interruptedHeight}" width="${w}" height="${interruptedHeight}"/>`;
  }).join("");
  const grid = [0.25, 0.5, 0.75].map(value => `<line x1="0" x2="${width}" y1="${height * value}" y2="${height * value}" />`).join("");
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><g class="grid">${grid}</g>${bars}</svg>`;
}

function chartFooter(startId, peakId, endId) {
  const footer = node("div", "chart-footer");
  const start = node("span", "", "—"); start.id = startId;
  const peak = node("strong", "", "—"); peak.id = peakId;
  const end = node("span", "", "—"); end.id = endId;
  footer.append(start, peak, end);
  return footer;
}

function dataDisclosure(id) {
  const details = node("details", "data-disclosure"); details.id = id;
  details.append(node("summary", "", "View accessible chart data"), node("div", "table-scroll"));
  return details;
}

function renderDataTable(detailsId, headings, rows, caption) {
  const details = byId(detailsId);
  const holder = details.querySelector(".table-scroll");
  holder.replaceChildren(dataTable(headings, rows, caption));
}

function dataTable(headings, rows, captionText) {
  const table = node("table");
  if (captionText) table.append(node("caption", "", captionText));
  const head = node("thead"); const headRow = node("tr");
  headings.forEach((label, index) => { const th = node("th", index ? "numeric" : "", label); th.scope = "col"; headRow.append(th); });
  head.append(headRow);
  const body = node("tbody");
  rows.forEach(values => { const row = node("tr"); values.forEach((value, index) => row.append(tableCell(value, index ? "numeric" : ""))); body.append(row); });
  table.append(head, body);
  return table;
}

function tableCell(value, className = "") { return node("td", className, value); }
function projectHref(project, from) { return `#project/${encodeURIComponent(project.key)}?from=${encodeURIComponent(from)}`; }
function evidenceHref(project, from) { return `#project/${encodeURIComponent(project.key)}/evidence?from=${encodeURIComponent(from)}`; }
function terminalCount(value, suffix = "") { return value[`turnsCompleted${suffix}`] + value[`turnsError${suffix}`] + value[`turnsInterrupted${suffix}`]; }
function share(value, total) { return total ? value / total : null; }
function formatPercent(value) { return value == null ? "—" : percent.format(value); }
function formatRate(value) { return value == null ? "—" : decimal.format(value); }
function signedNumber(value) { return `${value > 0 ? "+" : ""}${number.format(value)}`; }

function comparisonLabel(current, previous) {
  if (current === 0 && previous === 0) return "No requested turns in either window";
  if (previous === 0) return `${number.format(current)} current · none in preceding window`;
  return `${signedNumber(current - previous)} versus preceding seven days`;
}

function shortComparison(current, previous) {
  if (current === 0 && previous === 0) return "0";
  if (previous === 0) return "Current only";
  return signedNumber(current - previous);
}

function aggregateDaily(rows) {
  return rows.reduce((total, row) => {
    ["toolStarts", "toolCompletions", "runtimeErrors", "planUpdates", "checkpoints", "compactions"].forEach(field => { total[field] += row[field]; });
    return total;
  }, { toolStarts: 0, toolCompletions: 0, runtimeErrors: 0, planUpdates: 0, checkpoints: 0, compactions: 0 });
}

function activityTotal(project) { return project.activity.reduce((sum, item) => sum + item.count, 0); }
function chartPoint(index, value, count, max, width, height, pad) {
  const x = count === 1 ? width / 2 : index / (count - 1) * width;
  const y = height - pad - value / max * (height - pad * 2);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function formatTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

function formatDay(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatRelative(value) {
  if (!value) return "—";
  const seconds = (Date.now() - new Date(value).getTime()) / 1000;
  if (seconds < -300) return "Invalid future time";
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDay(value.slice(0, 10));
}

function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function recencyLabel(value) {
  return {
    "within-24h": "Within 24 hours",
    "two-to-seven-days": "Two to seven days",
    "eight-to-thirty-days": "Eight to thirty days",
    "beyond-30d": "Beyond thirty days",
    unknown: "Unknown recency",
    invalid: "Invalid future timestamp",
  }[value] || value;
}

function activityLabel(value) { return value.replaceAll(".", " · ").replaceAll("-", " "); }

byId("refresh-button").addEventListener("click", loadDashboard);
window.addEventListener("hashchange", route);
loadDashboard();
setInterval(loadDashboard, 60_000);
