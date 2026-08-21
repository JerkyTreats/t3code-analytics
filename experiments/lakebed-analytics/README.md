# Lakebed Analytics Experiment

This capsule tests Lakebed as a small publication and presentation layer for governed analytical snapshots.

All values are synthetic. The capsule does not connect to T3Code, store user topology, or admit raw interaction content.

## Run

Copy the example environment file and replace the local write key:

```sh
cp .env.lakebed.server.example .env.lakebed.server
npx lakebed dev --port 4173
```

Publish the baseline fixture:

```sh
curl -X POST http://localhost:4173/api/publish-demo \
  -H 'content-type: application/json' \
  -H 'x-experiment-key: local-reflection-key' \
  --data '{"version":"alpha"}'
```

Read the current snapshot:

```sh
curl http://localhost:4173/api/dashboard
```

Publish the successor by changing the version to `beta`.

Run the coherent-reader stress check while the development server is active:

```sh
bash tests/atomic-publication.sh
```

## Boundary

The write endpoint is an experiment-only loading seam. It accepts only two fixtures compiled into the server and requires a server environment key. Do not deploy this capsule as a production analytics service.

Each publication writes the new snapshot and its metric rows, retires the previous current snapshot, and activates the new snapshot inside one Lakebed transaction. The dashboard query reads the current snapshot and its metric rows inside one repeatable read transaction.
