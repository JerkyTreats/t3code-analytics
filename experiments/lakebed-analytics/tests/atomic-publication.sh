#!/usr/bin/env bash
set -euo pipefail

experiment_port="${EXPERIMENT_PORT:-4173}"
experiment_key="${EXPERIMENT_WRITE_KEY:-local-reflection-key}"
base_url="http://localhost:${experiment_port}"

publish_fixture() {
  local version="$1"
  curl -fsS -X POST "${base_url}/api/publish-demo" \
    -H 'content-type: application/json' \
    -H "x-experiment-key: ${experiment_key}" \
    --data "{\"version\":\"${version}\"}"
}

assert_coherent_dashboard() {
  curl -fsS "${base_url}/api/dashboard" | jq -e '
    .dashboard as $view
    | [$view.metrics[].value] as $values
    | $view.snapshot.isCurrent == true
      and ($view.metrics | length) == 4
      and (
        ($view.snapshot.snapshotKey == "synthetic-alpha" and $values == ["100", "92.0", "18", "900"])
        or
        ($view.snapshot.snapshotKey == "synthetic-beta" and $values == ["140", "95.0", "24", "1,320"])
      )
  ' >/dev/null
}

publish_fixture alpha >/dev/null
assert_coherent_dashboard
publish_fixture beta >/dev/null
assert_coherent_dashboard

(
  for index in $(seq 1 24); do
    if (( index % 2 == 0 )); then
      publish_fixture alpha >/dev/null
    else
      publish_fixture beta >/dev/null
    fi
  done
) &
writer_pid=$!

for _ in $(seq 1 80); do
  assert_coherent_dashboard
done

wait "$writer_pid"

npx lakebed db dump --port "$experiment_port" | jq -e '
  [.tables.snapshots[] | select(.isCurrent == true)] | length == 1
' >/dev/null

echo "atomic-publication-ok"
