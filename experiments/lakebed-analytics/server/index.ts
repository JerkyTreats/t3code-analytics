import { boolean, capsule, endpoint, id, json, query, string, table, text } from "lakebed/server";
import type { DashboardView, MetricFamily, PublicationResult } from "../shared/analytics";

type FixtureMetric = {
  metricKey: string;
  label: string;
  value: string;
  unit: string;
  family: MetricFamily;
  ordinal: string;
};

type Fixture = {
  snapshotKey: string;
  label: string;
  observedAt: string;
  source: string;
  quality: string;
  metrics: FixtureMetric[];
};

const fixtures: Record<string, Fixture> = {
  alpha: {
    snapshotKey: "synthetic-alpha",
    label: "Synthetic baseline",
    observedAt: "2026-08-20T09:00:00Z",
    source: "generated experiment fixture",
    quality: "synthetic and internally reconciled",
    metrics: [
      { metricKey: "turns", label: "Turn attempts", value: "100", unit: "turns", family: "throughput", ordinal: "01" },
      { metricKey: "completion", label: "Terminal completion", value: "92.0", unit: "percent", family: "throughput", ordinal: "02" },
      { metricKey: "threads", label: "Active work threads", value: "18", unit: "threads", family: "reach", ordinal: "03" },
      { metricKey: "activities", label: "Canonical activities", value: "900", unit: "events", family: "activity", ordinal: "04" }
    ]
  },
  beta: {
    snapshotKey: "synthetic-beta",
    label: "Synthetic successor",
    observedAt: "2026-08-21T09:00:00Z",
    source: "generated experiment fixture",
    quality: "synthetic and internally reconciled",
    metrics: [
      { metricKey: "turns", label: "Turn attempts", value: "140", unit: "turns", family: "throughput", ordinal: "01" },
      { metricKey: "completion", label: "Terminal completion", value: "95.0", unit: "percent", family: "throughput", ordinal: "02" },
      { metricKey: "threads", label: "Active work threads", value: "24", unit: "threads", family: "reach", ordinal: "03" },
      { metricKey: "activities", label: "Canonical activities", value: "1,320", unit: "events", family: "activity", ordinal: "04" }
    ]
  }
};

async function readDashboard(ctx: any): Promise<DashboardView | null> {
  const snapshot = await ctx.db.snapshots
    .withIndex("by_current", (range: any) => range.eq("isCurrent", true))
    .order("desc")
    .first();

  if (!snapshot) {
    return null;
  }

  const metrics = await ctx.db.metrics
    .withIndex("by_snapshot", (range: any) => range.eq("snapshotId", snapshot.id))
    .order("asc")
    .collect();

  return { snapshot, metrics };
}

async function publishFixture(ctx: any, version: string): Promise<PublicationResult> {
  const fixture = fixtures[version];
  if (!fixture) {
    return { ok: false, error: "unknown fixture version" };
  }

  const currentSnapshots = await ctx.db.snapshots
    .withIndex("by_current", (range: any) => range.eq("isCurrent", true))
    .order("asc")
    .collect();

  const snapshot = await ctx.db.snapshots.insert({
    snapshotKey: fixture.snapshotKey,
    label: fixture.label,
    observedAt: fixture.observedAt,
    source: fixture.source,
    quality: fixture.quality,
    isCurrent: false
  });

  for (const metric of fixture.metrics) {
    await ctx.db.metrics.insert({
      snapshotId: snapshot.id,
      metricKey: metric.metricKey,
      label: metric.label,
      value: metric.value,
      unit: metric.unit,
      family: metric.family,
      ordinal: metric.ordinal
    });
  }

  for (const current of currentSnapshots) {
    await ctx.db.snapshots.update(current.id, { isCurrent: false });
  }

  await ctx.db.snapshots.update(snapshot.id, { isCurrent: true });
  return { ok: true, version, snapshotId: snapshot.id };
}

export default capsule({
  name: "t3code-analytics-experiment",

  schema: {
    snapshots: table({
      snapshotKey: string(),
      label: string(),
      observedAt: string(),
      source: string(),
      quality: string(),
      isCurrent: boolean().default(false)
    })
      .index("by_current", ["isCurrent"])
      .index("by_key", ["snapshotKey"]),
    metrics: table({
      snapshotId: id("snapshots"),
      metricKey: string(),
      label: string(),
      value: string(),
      unit: string(),
      family: string(),
      ordinal: string()
    }).index("by_snapshot", ["snapshotId", "ordinal"])
  },

  queries: {
    dashboard: query((ctx) => readDashboard(ctx))
  },

  endpoints: {
    dashboard: endpoint({ method: "GET", path: "/api/dashboard" }, async (ctx) =>
      json({ dashboard: await readDashboard(ctx) })
    ),
    publishDemo: endpoint({ method: "POST", path: "/api/publish-demo" }, async (ctx, req) => {
      const expectedKey = ctx.env.EXPERIMENT_WRITE_KEY;
      if (!expectedKey || req.headers.get("x-experiment-key") !== expectedKey) {
        return text("forbidden", { status: 403 });
      }

      const body = await req.json<{ version?: string }>();
      const result = await publishFixture(ctx, String(body.version ?? ""));
      return json(result, { status: result.ok ? 200 : 400 });
    })
  }
});
