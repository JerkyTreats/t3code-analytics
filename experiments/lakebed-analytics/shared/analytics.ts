export type MetricFamily = "throughput" | "reach" | "activity" | "capacity";

export type SnapshotMetric = {
  id: string;
  metricKey: string;
  label: string;
  value: string;
  unit: string;
  family: MetricFamily;
  ordinal: string;
  createdAt: string;
  updatedAt: string;
};

export type PublishedSnapshot = {
  id: string;
  snapshotKey: string;
  label: string;
  observedAt: string;
  source: string;
  quality: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardView = {
  snapshot: PublishedSnapshot;
  metrics: SnapshotMetric[];
};

export type PublicationResult = {
  ok: boolean;
  version?: string;
  snapshotId?: string;
  error?: string;
};
