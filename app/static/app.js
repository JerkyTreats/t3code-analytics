const number = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

const byId = id => document.getElementById(id);
const setText = (id, value) => { byId(id).textContent = value; };

async function loadDashboard() {
  setText("status-label", "Refreshing aggregate");
  try {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) throw new Error(`dashboard returned ${response.status}`);
    render(await response.json());
    setText("status-label", "Snapshot coherent");
  } catch (error) {
    console.error(error);
    setText("status-label", "Snapshot unavailable");
  }
}

function render(data) {
  const { snapshot, summary, daily, activity } = data;
  setText("snapshot-time", `Generated ${formatTime(snapshot.generatedAt)}`);
  setText("turns-requested", number.format(summary.turnsRequested));
  setText("active-days", `Across ${number.format(summary.activeDays)} active days`);
  setText("completion-rate", summary.terminalCompletionRate == null ? "—" : percent.format(summary.terminalCompletionRate));
  setText("terminal-mix", `${number.format(summary.turnsCompleted)} completed`);
  setText("active-threads", number.format(summary.activeThreads));
  setText("in-flight", number.format(summary.turnsInFlight));
  setText("stale-in-flight", `${number.format(summary.staleInFlight)} older than six hours`);
  setText("completed-count", number.format(summary.turnsCompleted));
  setText("error-count", number.format(summary.turnsError));
  setText("interrupted-count", number.format(summary.turnsInterrupted));
  setText("projection-lag", number.format(snapshot.projectionLag));
  setText("source-freshness", formatDuration(snapshot.sourceFreshnessSeconds));
  setText("source-sequence", number.format(snapshot.sourceEventSequence));

  const terminal = summary.turnsCompleted + summary.turnsError + summary.turnsInterrupted;
  const angle = terminal === 0 ? 0 : summary.turnsCompleted / terminal * 360;
  byId("outcome-ring").style.setProperty("--complete-angle", `${angle}deg`);
  renderTimeline(daily);
  renderActivity(activity);
}

function renderTimeline(rows) {
  const target = byId("timeline");
  target.replaceChildren();
  if (!rows.length) {
    target.textContent = "No activity in the current window";
    return;
  }
  const width = 1200;
  const height = 280;
  const max = Math.max(...rows.flatMap(row => [row.turnsRequested, row.toolStarts]), 1);
  const point = (row, index, key) => {
    const x = rows.length === 1 ? width / 2 : index / (rows.length - 1) * width;
    const y = height - 18 - row[key] / max * (height - 38);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };
  const turns = rows.map((row, index) => point(row, index, "turnsRequested")).join(" ");
  const tools = rows.map((row, index) => point(row, index, "toolStarts")).join(" ");
  const grid = [0.25, 0.5, 0.75].map(fraction => `<line x1="0" x2="${width}" y1="${height * fraction}" y2="${height * fraction}" class="grid" />`).join("");
  target.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <style>
        .grid { stroke: #252725; stroke-width: 1; vector-effect: non-scaling-stroke; }
        .turns { fill: none; stroke: #d5ff43; stroke-width: 3; vector-effect: non-scaling-stroke; }
        .tools { fill: none; stroke: #68d9e8; stroke-width: 1.5; opacity: .72; vector-effect: non-scaling-stroke; }
      </style>
      ${grid}
      <polyline class="tools" points="${tools}" />
      <polyline class="turns" points="${turns}" />
    </svg>`;
  setText("range-start", formatDay(rows[0].day));
  setText("range-end", formatDay(rows.at(-1).day));
}

function renderActivity(rows) {
  const target = byId("activity-list");
  target.replaceChildren();
  const max = Math.max(...rows.map(row => row.count), 1);
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "activity-row";
    const label = document.createElement("span");
    label.textContent = row.kind.replaceAll(".", " · ");
    const track = document.createElement("div");
    track.className = "activity-track";
    const fill = document.createElement("i");
    fill.className = "activity-fill";
    fill.style.width = `${row.count / max * 100}%`;
    track.append(fill);
    const count = document.createElement("b");
    count.textContent = number.format(row.count);
    item.append(label, track, count);
    target.append(item);
  }
}

function formatTime(value) {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

function formatDay(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return "Unknown";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

byId("refresh-button").addEventListener("click", loadDashboard);
loadDashboard();
setInterval(loadDashboard, 60_000);
