const number = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const rate = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const colors = ["#d5ff43", "#68d9e8", "#ff9f5a", "#d29cff", "#69e0a8", "#59605d"];

const byId = id => document.getElementById(id);
const setText = (id, value) => { byId(id).textContent = value; };
let dashboardData = null;

const candidateBoards = {
  git: {
    mark: "GIT",
    title: "Durable change evidence",
    status: "Contract candidate · no data admitted",
    description: "A repository evidence board designed to remain independent until an explicit privacy-safe project mapping and source contract are accepted.",
    note: "This board starts verbose. It would expose deterministic change evidence before any signal is elevated into project synthesis.",
    boundary: "Repository locations, remotes, branches, authorship, commit subjects, and cross-repository relationships are not admitted by the current contract. This board therefore shows its intended components without manufacturing values.",
    components: [
      ["Commit cadence", "Daily commit distribution and return intervals", "event time · commit count · measured coverage"],
      ["Change classes", "Conventional change categories without raw commit text", "class · count · classification coverage"],
      ["Verification milestones", "Tests and checks attached to immutable change evidence", "result · completion time · commit reference"],
      ["Delivery closure", "Merge, tag, and release transitions", "state transition · event time · coverage"],
      ["Narrative clusters", "Provisional related-change episodes", "claim · confidence · evidence count · model revision"],
    ],
  },
  codex: {
    mark: "CDX",
    title: "Agent context evidence",
    status: "Contract candidate · no data admitted",
    description: "A `.codex` evidence board for goal state, orchestration, model routing, and semantic collection coverage without copying private content or topology.",
    note: "The useful layer is transition metadata and validation coverage, not prompts, paths, summaries, identities, or raw event payloads.",
    boundary: "Raw prompts, objective text, local paths, repository fields, logs, memories, account data, session data, and source identifiers remain excluded. A separate adapter must discard them before any durable or published boundary.",
    components: [
      ["Goal transitions", "Active, blocked, resumed, complete, and constrained states", "state · transition time · terminal disposition"],
      ["Orchestration shape", "Aggregate fanout and child terminal outcomes", "role class · child count · status coverage"],
      ["Model routing", "Model and reasoning class by admitted work episode", "model class · effort class · observed count"],
      ["Run lifecycle", "Turn states and duration distributions", "status · duration bucket · coverage"],
      ["Semantic coverage", "Provisional claims that have passed admission checks", "claim class · confidence · validator state"],
    ],
  },
};

async function loadDashboard() {
  setText("status-label", "Refreshing aggregate");
  try {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) throw new Error(`dashboard returned ${response.status}`);
    dashboardData = await response.json();
    renderOverview(dashboardData);
    route();
    setText("status-label", dashboardData.snapshot.projectionLag === 0 ? "Projection cursors aligned" : "Projection lag observed");
  } catch (error) {
    console.error(error);
    setText("status-label", "Snapshot unavailable");
  }
}

function renderOverview(data) {
  const { snapshot, summary, daily, projects, activity, activityCoverage } = data;
  const terminal = summary.turnsCompleted + summary.turnsError + summary.turnsInterrupted;
  setText("snapshot-time", `Generated ${formatTime(snapshot.generatedAt)}`);
  setText("active-projects", number.format(summary.activeProjects7d));
  setText("active-projects-context", `${number.format(summary.activeProjects24h)} in past 24h · ${number.format(summary.currentProjects)} current`);
  setText("turns-requested", number.format(summary.turnsRequested));
  setText("turns-delta", comparisonLabel(summary.turnsRequested, summary.turnsPrevious));
  setText("active-threads", number.format(summary.activeThreads));
  setText("completion-rate", formatPercent(summary.terminalCompletionRate));
  setText("terminal-denominator", `${number.format(terminal)} terminal turns`);
  setText("current-only-projects", number.format(summary.currentOnlyProjects));
  setText("cooling-projects", number.format(summary.coolingProjects));
  setText("top-three-share", formatPercent(summary.topThreeTurnShare));
  setText("dormant-projects", number.format(summary.dormantProjects30d));
  setText("projection-lag", number.format(snapshot.projectionLag));
  setText("source-freshness", formatDuration(snapshot.sourceFreshnessSeconds));
  setText("source-sequence", `Sequence ${number.format(snapshot.sourceEventSequence)}`);

  renderElevatedSignals(summary, activityCoverage);

  renderPortfolioChart(projects, daily);
  renderProjectTable(projects);
  renderBars("activity-list", activity.slice(0, 8).map(item => ({
    label: activityLabel(item.kind),
    value: item.perHundredTurns,
    display: item.perHundredTurns == null ? "—" : rate.format(item.perHundredTurns),
  })));
  renderCoverage(activityCoverage);
}

function renderElevatedSignals(summary, coverage) {
  const share = summary.topThreeTurnShare;
  const shape = share == null ? "Unknown" : share >= 0.75 ? "Concentrated" : share >= 0.5 ? "Focused" : "Distributed";
  setText("portfolio-shape", shape);
  setText("portfolio-shape-note", share == null ? "No measured distribution in this window." : `${percent.format(share)} of requested turns sit in the three most active projects.`);

  const entered = summary.currentOnlyProjects;
  const cooled = summary.coolingProjects;
  const movement = entered > cooled ? "Expanding" : entered < cooled ? "Cooling" : "Balanced";
  setText("portfolio-movement", movement);
  setText("portfolio-movement-note", `${number.format(entered)} projects entered current activity while ${number.format(cooled)} cooled.`);

  const attribution = coverage.total ? coverage.attributedToTurn / coverage.total : null;
  const readiness = attribution == null ? "Unmeasured" : attribution >= 0.9 ? "Strong" : attribution >= 0.65 ? "Usable" : "Partial";
  setText("portfolio-evidence", readiness);
  setText("portfolio-evidence-note", attribution == null ? "No admitted activity coverage." : `${percent.format(attribution)} of admitted activity resolves to a projected turn.`);
}

function renderPortfolioChart(projects, daily) {
  const target = byId("portfolio-chart");
  const legend = byId("project-legend");
  target.replaceChildren();
  legend.replaceChildren();
  if (!daily.length || !projects.length) {
    target.textContent = "No measured days in this window";
    return;
  }

  const ranked = projects
    .map(project => ({ project, total: project.daily.reduce((sum, day) => sum + day.turnsRequested, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(item => item.project);
  const rankedKeys = new Set(ranked.map(project => project.key));
  const series = ranked.map(project => ({ label: project.title, values: project.daily.map(day => day.turnsRequested) }));
  const otherProjects = projects.filter(project => !rankedKeys.has(project.key));
  if (otherProjects.length) {
    series.push({
      label: "Other",
      values: daily.map((_, index) => otherProjects.reduce((sum, project) => sum + project.daily[index].turnsRequested, 0)),
    });
  }

  series.forEach((item, index) => {
    const entry = document.createElement("span");
    const swatch = document.createElement("i");
    swatch.style.background = colors[index];
    entry.append(swatch, document.createTextNode(item.label));
    legend.append(entry);
  });

  const width = 1200;
  const height = 300;
  const pad = 16;
  const totals = daily.map((_, index) => series.reduce((sum, item) => sum + item.values[index], 0));
  const max = Math.max(...totals, 1);
  const lower = new Array(daily.length).fill(0);
  const paths = series.map((item, index) => {
    const upper = lower.map((value, day) => value + item.values[day]);
    const topPoints = upper.map((value, day) => point(day, value, daily.length, max, width, height, pad));
    const bottomPoints = lower.map((value, day) => point(day, value, daily.length, max, width, height, pad)).reverse();
    upper.forEach((value, day) => { lower[day] = value; });
    return `<path d="M ${topPoints.join(" L ")} L ${bottomPoints.join(" L ")} Z" fill="${colors[index]}" opacity="${index === 0 ? 0.92 : 0.72}" />`;
  });
  const grid = [0.25, 0.5, 0.75].map(value => `<line x1="0" x2="${width}" y1="${height * value}" y2="${height * value}" />`).join("");
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><g class="grid">${grid}</g>${paths.reverse().join("")}</svg>`;
  setText("range-start", formatDay(daily[0].day));
  setText("range-end", formatDay(daily.at(-1).day));
  target.nextElementSibling.children[1].textContent = `Peak ${number.format(max)} daily turns`;
  renderChartTable(
    "portfolio-chart-data",
    ["UTC date", ...series.map(item => item.label)],
    daily.map((day, index) => [formatDay(day.day), ...series.map(item => number.format(item.values[index]))]),
    "Daily requested turns by project",
  );
}

function renderProjectTable(projects) {
  const target = byId("project-table");
  target.replaceChildren();
  const query = byId("project-search").value.trim().toLocaleLowerCase();
  const recency = byId("recency-filter").value;
  const visible = projects.filter(project => {
    const matchesQuery = !query || project.title.toLocaleLowerCase().includes(query);
    const matchesRecency = recency === "all" || project.recencyBand === recency;
    return matchesQuery && matchesRecency;
  });
  byId("project-empty").hidden = visible.length !== 0;

  for (const project of visible) {
    const row = document.createElement("tr");
    const title = cell();
    const titleStrong = document.createElement("a");
    titleStrong.className = "project-link";
    titleStrong.href = `#project/${encodeURIComponent(project.key)}`;
    titleStrong.textContent = project.title;
    const titleMeta = document.createElement("small");
    titleMeta.textContent = `${number.format(project.currentThreads)} current threads`;
    title.append(titleStrong, titleMeta);

    row.append(
      title,
      cell(formatRelative(project.lastWorkAt)),
      cell(number.format(project.turns7d), "numeric"),
      cell(formatPercent(project.turnShare7d), "numeric"),
      cell(shortComparison(project.turns7d, project.turnsPrevious), "numeric"),
      cell(number.format(project.activeThreads7d), "numeric"),
      signalCell(project),
    );
    target.append(row);
  }
}

function renderCoverage(coverage) {
  const total = coverage.total;
  const attributed = safeShare(coverage.attributedToTurn, total);
  const threadLevel = safeShare(coverage.threadLevel, total);
  const unresolved = safeShare(coverage.unresolvedTurn, total);
  const target = byId("coverage-bar");
  target.replaceChildren();
  target.classList.toggle("is-empty", total === 0);
  target.setAttribute("aria-label", total ? `Activity attribution coverage. ${percent.format(attributed)} turn attributed, ${percent.format(threadLevel)} thread level, ${percent.format(unresolved)} unresolved turn.` : "No measured activity in this window.");
  [
    [attributed, "attributed", "Turn attributed"],
    [threadLevel, "thread-level", "Thread level"],
    [unresolved, "unresolved", "Unresolved turn"],
  ].forEach(([value, className, label]) => {
    const segment = document.createElement("i");
    segment.className = className;
    segment.style.width = `${value * 100}%`;
    segment.title = `${label}: ${percent.format(value)}`;
    target.append(segment);
  });
  setText("coverage-attributed", total ? `${percent.format(attributed)} · ${compact.format(coverage.attributedToTurn)}` : "—");
  setText("coverage-thread", total ? `${percent.format(threadLevel)} · ${compact.format(coverage.threadLevel)}` : "—");
  setText("coverage-unresolved", total ? `${percent.format(unresolved)} · ${compact.format(coverage.unresolvedTurn)}` : "—");
}

function route() {
  if (!dashboardData) return;
  const hash = window.location.hash || "#overview";
  const sourceMatch = hash.match(/^#project\/([^/]+)\/(t3code|git|codex|evidence)$/);
  const projectMatch = sourceMatch ? null : hash.match(/^#project\/([^/]+)$/);
  const key = sourceMatch?.[1] || projectMatch?.[1];
  const project = key ? dashboardData.projects.find(item => item.key === decodeURIComponent(key)) : null;
  const board = sourceMatch?.[2] || null;

  byId("view-overview").hidden = Boolean(project);
  byId("view-project").hidden = !project || Boolean(board);
  byId("view-source").hidden = !project || !board;
  updateTopNavigation(project, board);

  if (project) {
    renderProject(project);
    if (board) renderSourceBoard(project, board);
    window.scrollTo({ top: 0, behavior: "auto" });
  } else {
    document.title = "T3Code Work Atlas";
  }
}

function updateTopNavigation(project, board) {
  document.querySelector(".view-nav > a:first-child").classList.toggle("active", !project);
  byId("nav-project").classList.toggle("active", Boolean(project) && !board);
  byId("nav-source").classList.toggle("active", Boolean(board) && board !== "evidence");
  byId("nav-evidence").classList.toggle("active", board === "evidence");
  setText("nav-project", project ? project.title : "Project");
  setText("nav-source", board && board !== "evidence" ? sourceLabel(board) : "Source");
  const root = project ? `#project/${encodeURIComponent(project.key)}` : "#overview";
  byId("nav-project").href = root;
  byId("nav-source").href = project ? `${root}/${board && board !== "evidence" ? board : "t3code"}` : "#overview";
  byId("nav-evidence").href = project ? `${root}/evidence` : "#overview";
  ["nav-project", "nav-source", "nav-evidence"].forEach(id => {
    byId(id).setAttribute("aria-disabled", String(!project));
  });
}

function renderProject(project) {
  const terminal = project.turnsCompleted7d + project.turnsError7d + project.turnsInterrupted7d;
  setText("project-title", project.title);
  setText("project-last-work", formatTime(project.lastWorkAt));
  setText("project-recency-band", recencyLabel(project.recencyBand));
  setText("project-turns", number.format(project.turns7d));
  setText("project-turns-delta", comparisonLabel(project.turns7d, project.turnsPrevious));
  setText("project-active-threads", number.format(project.activeThreads7d));
  setText("project-thread-context", `${number.format(project.newThreads7d)} new · ${number.format(project.currentThreads)} current`);
  setText("project-share", formatPercent(project.turnShare7d));
  setText("project-share-denominator", `${number.format(project.turns7d)} of ${number.format(dashboardData.summary.turnsRequested)} project-linked turns`);
  setText("project-completion", formatPercent(project.terminalCompletionRate7d));
  setText("project-terminal-denominator", `${number.format(terminal)} terminal turns`);
  setText("project-completed", number.format(project.turnsCompleted7d));
  setText("project-error", number.format(project.turnsError7d));
  setText("project-interrupted", number.format(project.turnsInterrupted7d));
  setText("project-in-flight", number.format(project.turnsInFlight));
  renderProjectReading(project);
  setProjectLinks(project);
  renderLineChart(project.daily);
  renderThreadRecency(project.threadRecency);
  renderOutcome(project, terminal);
  renderBars("project-activity", project.activity.slice(0, 7).map(item => ({
    label: activityLabel(item.kind),
    value: item.perHundredTurns,
    display: item.perHundredTurns == null ? "—" : rate.format(item.perHundredTurns),
  })));
  const coverage = project.activityCoverage;
  const known = coverage.total ? coverage.attributedToTurn / coverage.total : null;
  setText("project-activity-note", known == null ? "No activity measured in this window." : `${percent.format(known)} is attributed to a projected turn. Thread-level activity remains separate.`);
  document.title = `${project.title} · T3Code Work Atlas`;
}

function renderProjectReading(project) {
  const delta = project.turns7d - project.turnsPrevious;
  const direction = project.turnsPrevious === 0 && project.turns7d > 0
    ? "Newly active in this window"
    : delta > 0
      ? "Activity is increasing"
      : delta < 0
        ? "Activity is cooling"
        : "Activity is steady";
  setText("project-reading-title", direction);
  setText("project-reading-note", `${number.format(project.turns7d)} requested turns and ${number.format(project.activeThreads7d)} active threads are admitted from T3Code. Git and .codex remain independent contract candidates, so no cross-source narrative is asserted yet.`);
  setText("project-synthesis-state", "Single-source · provisional");
}

function setProjectLinks(project) {
  const root = `#project/${encodeURIComponent(project.key)}`;
  byId("open-t3code-board").href = `${root}/t3code`;
  byId("open-git-board").href = `${root}/git`;
  byId("open-codex-board").href = `${root}/codex`;
  byId("open-evidence-board").href = `${root}/evidence`;
}

function renderSourceBoard(project, board) {
  const root = `#project/${encodeURIComponent(project.key)}`;
  byId("source-back-button").dataset.target = root;
  ["t3code", "git", "codex", "evidence"].forEach(name => {
    byId(`tab-${name}`).href = `${root}/${name}`;
    byId(`tab-${name}`).classList.toggle("active", name === board);
  });

  byId("board-t3code").hidden = board !== "t3code";
  byId("board-candidate").hidden = !["git", "codex"].includes(board);
  byId("board-evidence").hidden = board !== "evidence";
  byId("source-depth-item").classList.toggle("active", board !== "evidence");
  byId("evidence-depth-item").classList.toggle("active", board === "evidence");

  if (board === "t3code") renderT3CodeBoard(project);
  if (board === "git" || board === "codex") renderCandidateBoard(project, board);
  if (board === "evidence") renderEvidenceBoard(project);
}

function renderT3CodeBoard(project) {
  setText("source-kicker", `${project.title} · source board`);
  setText("source-title", "T3Code evidence");
  setText("source-status", "Admitted · live aggregate");
  setText("source-description", "The most detailed view of the currently admitted project, thread, turn, outcome, and activity hierarchy.");
  setText("source-current-threads", number.format(project.currentThreads));
  setText("source-active-threads", number.format(project.activeThreads7d));
  setText("source-new-thread-context", `${number.format(project.newThreads7d)} newly active threads`);
  setText("source-in-flight", number.format(project.turnsInFlight));
  const coverage = project.activityCoverage;
  setText("source-attribution-rate", coverage.total ? percent.format(coverage.attributedToTurn / coverage.total) : "—");
  document.title = `T3Code evidence · ${project.title}`;
}

function renderCandidateBoard(project, board) {
  const config = candidateBoards[board];
  setText("source-kicker", `${project.title} · source board`);
  setText("source-title", sourceLabel(board));
  setText("source-status", config.status);
  setText("source-description", config.description);
  setText("candidate-mark", config.mark);
  setText("candidate-title", config.title);
  setText("candidate-note", config.note);
  setText("candidate-boundary", config.boundary);

  const target = byId("candidate-components");
  target.replaceChildren();
  config.components.forEach(([title, description, grain], index) => {
    const article = document.createElement("article");
    const numberLabel = document.createElement("span");
    numberLabel.textContent = `${String(index + 1).padStart(2, "0")}`;
    const heading = document.createElement("strong");
    heading.textContent = title;
    const body = document.createElement("p");
    body.textContent = description;
    const meta = document.createElement("small");
    meta.textContent = grain;
    article.append(numberLabel, heading, body, meta);
    target.append(article);
  });
  document.title = `${sourceLabel(board)} board · ${project.title}`;
}

function renderEvidenceBoard(project) {
  setText("source-kicker", `${project.title} · deepest layer`);
  setText("source-title", "Evidence ledger");
  setText("source-status", "Admitted facts · no semantic inference");
  setText("source-description", "The exact values beneath project synthesis, including their grain and the limits on what they can support.");

  const coverage = project.activityCoverage;
  const terminal = project.turnsCompleted7d + project.turnsError7d + project.turnsInterrupted7d;
  const rows = [
    ["Last admitted work", formatTime(project.lastWorkAt), "Project", "Recency only; not attention duration"],
    ["Requested turns", number.format(project.turns7d), "Project · rolling 7d", "Activity volume; not productivity"],
    ["Prior requested turns", number.format(project.turnsPrevious), "Project · preceding 7d", "Comparison baseline only"],
    ["Current threads", number.format(project.currentThreads), "Project snapshot", "Projected work objects; not sessions or people"],
    ["Active threads", number.format(project.activeThreads7d), "Project · rolling 7d", "Threads with requested turns"],
    ["Newly active threads", number.format(project.newThreads7d), "Project · rolling 7d", "First activity in the window; not thread creation"],
    ["Completed turns", number.format(project.turnsCompleted7d), "Request cohort · rolling 7d", "Source terminal state"],
    ["Error turns", number.format(project.turnsError7d), "Request cohort · rolling 7d", "Source terminal state"],
    ["Interrupted turns", number.format(project.turnsInterrupted7d), "Request cohort · rolling 7d", "Source terminal state"],
    ["Nonterminal turns", number.format(project.turnsInFlight), "Current source state", "Not equivalent to unfinished human work"],
    ["Terminal completion", terminal ? percent.format(project.turnsCompleted7d / terminal) : "—", "Terminal request cohort", "Excludes nonterminal turns"],
    ["Turn-attributed activity", number.format(coverage.attributedToTurn), "Admitted activity", "Exact projected-turn association"],
    ["Thread-level activity", number.format(coverage.threadLevel), "Admitted activity", "No exact turn association"],
    ["Unresolved-turn activity", number.format(coverage.unresolvedTurn), "Admitted activity", "Reference could not be resolved"],
  ];
  const target = byId("evidence-table");
  target.replaceChildren();
  rows.forEach(values => {
    const row = document.createElement("tr");
    values.forEach(value => row.append(cell(value)));
    target.append(row);
  });
  document.title = `Evidence ledger · ${project.title}`;
}

function sourceLabel(value) {
  return { t3code: "T3Code", git: "Git", codex: ".codex", evidence: "Evidence" }[value] || value;
}

function renderLineChart(rows) {
  const target = byId("project-chart");
  target.replaceChildren();
  if (!rows.length) {
    target.textContent = "No measured days in this window";
    return;
  }
  const width = 1200;
  const height = 280;
  const pad = 18;
  const max = Math.max(...rows.map(row => row.turnsRequested), 1);
  const points = rows.map((row, index) => point(index, row.turnsRequested, rows.length, max, width, height, pad));
  const grid = [0.25, 0.5, 0.75].map(value => `<line x1="0" x2="${width}" y1="${height * value}" y2="${height * value}" />`).join("");
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><g class="grid">${grid}</g><polyline class="project-trace" points="${points.join(" ")}" /></svg>`;
  setText("project-range-start", formatDay(rows[0].day));
  setText("project-range-end", formatDay(rows.at(-1).day));
  target.nextElementSibling.children[1].textContent = `Peak ${number.format(max)} daily turns`;
  renderChartTable(
    "project-chart-data",
    ["UTC date", "Requested turns", "Active threads"],
    rows.map(row => [formatDay(row.day), number.format(row.turnsRequested), number.format(row.activeThreads)]),
    "Daily project requested turns and active threads",
  );
}

function renderThreadRecency(recency) {
  renderBars("thread-recency", [
    { label: "Within 24 hours", value: recency.within24h, display: number.format(recency.within24h) },
    { label: "Two to seven days", value: recency.within7d, display: number.format(recency.within7d) },
    { label: "Eight to thirty days", value: recency.within30d, display: number.format(recency.within30d) },
    { label: "Beyond thirty days", value: recency.beyond30d, display: number.format(recency.beyond30d) },
    { label: "Unknown", value: recency.unknown, display: number.format(recency.unknown) },
  ]);
}

function renderOutcome(project, terminal) {
  const target = byId("project-outcome");
  target.replaceChildren();
  target.classList.toggle("is-empty", terminal === 0);
  target.setAttribute("aria-label", terminal ? `${number.format(project.turnsCompleted7d)} completed, ${number.format(project.turnsError7d)} error, ${number.format(project.turnsInterrupted7d)} interrupted.` : "No terminal turns in this request cohort.");
  [
    [project.turnsCompleted7d, "complete", "Completed"],
    [project.turnsError7d, "error", "Error"],
    [project.turnsInterrupted7d, "interrupted", "Interrupted"],
  ].forEach(([value, className, label]) => {
    const segment = document.createElement("i");
    segment.className = className;
    segment.style.width = `${terminal ? value / terminal * 100 : 0}%`;
    segment.title = `${label}: ${number.format(value)}`;
    target.append(segment);
  });
}

function renderBars(id, rows) {
  const target = byId(id);
  target.replaceChildren();
  if (!rows.length) {
    target.textContent = "No measured activity in this window";
    return;
  }
  const valid = rows.map(row => row.value).filter(value => value != null);
  const max = Math.max(...valid, 1);
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "bar-row";
    const label = document.createElement("span");
    label.textContent = row.label;
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("i");
    fill.style.width = row.value == null ? "0" : `${row.value / max * 100}%`;
    track.append(fill);
    const value = document.createElement("b");
    value.textContent = row.display;
    item.append(label, track, value);
    target.append(item);
  }
}

function renderChartTable(detailsId, headings, rows, captionText) {
  const details = byId(detailsId);
  const target = details.querySelector(".table-wrap");
  target.replaceChildren();
  const table = document.createElement("table");
  const caption = document.createElement("caption");
  caption.textContent = captionText;
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headings.forEach((heading, index) => {
    const headingCell = document.createElement("th");
    headingCell.scope = "col";
    headingCell.className = index ? "numeric" : "";
    headingCell.textContent = heading;
    headRow.append(headingCell);
  });
  head.append(headRow);
  const body = document.createElement("tbody");
  rows.forEach(values => {
    const row = document.createElement("tr");
    values.forEach((value, index) => row.append(cell(value, index ? "numeric" : "")));
    body.append(row);
  });
  table.append(caption, head, body);
  target.append(table);
}

function cell(value, className = "") {
  const element = document.createElement("td");
  element.className = className;
  if (value != null) element.textContent = value;
  return element;
}

function signalCell(project) {
  const element = cell();
  const signals = [];
  if (project.turnsInFlight) signals.push([`${project.turnsInFlight} nonterminal`, "live"]);
  if (project.actionablePlanThreads) signals.push([`${project.actionablePlanThreads} planned`, "plan"]);
  if (!project.turns7d && project.turnsPrevious) signals.push(["Cooling", "quiet"]);
  if (project.turns7d && !project.turnsPrevious) signals.push(["Current only", "current"]);
  if (!signals.length) signals.push([project.turns7d ? "Observed" : "Quiet", "quiet"]);
  signals.forEach(([text, className]) => {
    const signal = document.createElement("span");
    signal.className = `signal ${className}`;
    signal.textContent = text;
    element.append(signal);
  });
  return element;
}

function point(index, value, count, max, width, height, pad) {
  const x = count === 1 ? width / 2 : index / (count - 1) * width;
  const y = height - pad - value / max * (height - pad * 2);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function comparisonLabel(current, previous) {
  if (previous === 0 && current === 0) return "No turns in either seven-day window";
  if (previous === 0) return `${number.format(current)} in current window · none prior`;
  const delta = current - previous;
  return `${delta >= 0 ? "+" : ""}${number.format(delta)} turns vs preceding seven days`;
}

function shortComparison(current, previous) {
  if (previous === 0 && current === 0) return "0";
  if (previous === 0) return "Current only";
  const delta = current - previous;
  return `${delta >= 0 ? "+" : ""}${number.format(delta)}`;
}

function formatPercent(value) {
  return value == null ? "—" : percent.format(value);
}

function safeShare(value, total) {
  return total ? value / total : 0;
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

function activityLabel(value) {
  return value.replaceAll(".", " · ").replaceAll("-", " ");
}

byId("refresh-button").addEventListener("click", loadDashboard);
byId("back-button").addEventListener("click", () => { window.location.hash = "overview"; });
byId("source-back-button").addEventListener("click", event => { window.location.hash = event.currentTarget.dataset.target; });
byId("project-search").addEventListener("input", () => dashboardData && renderProjectTable(dashboardData.projects));
byId("recency-filter").addEventListener("change", () => dashboardData && renderProjectTable(dashboardData.projects));
window.addEventListener("hashchange", route);
loadDashboard();
setInterval(loadDashboard, 60_000);
