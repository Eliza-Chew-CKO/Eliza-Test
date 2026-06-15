/**
 * BigQuery client with Workload Identity Federation auth for AWS ECS Fargate.
 *
 * Auth flow:
 *   1. On ECS Fargate, the task role IAM credentials are available at
 *      http://169.254.170.2${AWS_CONTAINER_CREDENTIALS_RELATIVE_URI}
 *   2. Those credentials are exchanged for a short-lived GCP access token via
 *      Workload Identity Federation using the credential config JSON stored in
 *      GOOGLE_APPLICATION_CREDENTIALS_JSON.
 *   3. A background timer refreshes the AWS credentials into process.env every
 *      CREDENTIAL_REFRESH_INTERVAL_MS (default: 90 minutes) so that the next
 *      GCP token exchange picks up non-expired AWS tokens.
 *
 * Local development: set GOOGLE_APPLICATION_CREDENTIALS to a service account
 * key file, or ensure `gcloud auth application-default login` credentials exist.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { ExternalAccountClient } from 'google-auth-library';

const CREDENTIAL_REFRESH_INTERVAL_MS =
  parseInt(process.env.CREDENTIAL_REFRESH_INTERVAL_MS ?? '5400000', 10); // 90 min

// ─── BigQuery table references (configured via env vars) ─────────────────────

export const BQ = {
  project:            process.env.BQ_PROJECT_ID ?? '',
  dataset:            process.env.BQ_DATASET ?? 'noram',
  financials:         process.env.BQ_TABLE_FINANCIALS ?? 'financial_actuals',
  tpv:                process.env.BQ_TABLE_TPV ?? 'tpv_actuals',
  pipelineSnapshots:  process.env.BQ_TABLE_PIPELINE_SNAPSHOTS ?? 'pipeline_snapshots',
  opportunities:      process.env.BQ_TABLE_OPPORTUNITIES ?? 'opportunities',
  vamp:               process.env.BQ_TABLE_VAMP ?? 'vamp_records',
  targets:            process.env.BQ_TABLE_TARGETS ?? 'targets',
  amTargets:          process.env.BQ_TABLE_AM_TARGETS ?? 'am_targets',
  accounts:           process.env.BQ_TABLE_ACCOUNTS ?? 'accounts',
};

/** Fully-qualified BigQuery table reference: `project.dataset.table`. */
export function tbl(tableName: string): string {
  return `\`${BQ.project}.${BQ.dataset}.${tableName}\``;
}

// ─── Fargate credential refresh ───────────────────────────────────────────────

async function refreshFargateCredentials(): Promise<void> {
  const relativeUri = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
  if (!relativeUri) return;

  try {
    const res = await fetch(`http://169.254.170.2${relativeUri}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const creds = await res.json() as {
      AccessKeyId: string;
      SecretAccessKey: string;
      Token: string;
    };
    process.env.AWS_ACCESS_KEY_ID     = creds.AccessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = creds.SecretAccessKey;
    process.env.AWS_SESSION_TOKEN     = creds.Token;
    console.log('[bigquery] Fargate AWS credentials refreshed');
  } catch (err) {
    console.error('[bigquery] Failed to refresh Fargate credentials:', err);
  }
}

// ─── BigQuery client factory ──────────────────────────────────────────────────

let _bigquery: BigQuery | null = null;

export async function getBigQuery(): Promise<BigQuery> {
  if (_bigquery) return _bigquery;

  const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credJson) {
    // WIF path: exchange AWS credentials for a GCP token
    await refreshFargateCredentials();

    const authClient = ExternalAccountClient.fromJSON(
      JSON.parse(credJson),
    ) as InstanceType<typeof ExternalAccountClient>;

    _bigquery = new BigQuery({
      projectId: BQ.project || undefined,
      authClient,
    });

    // Start background refresh loop so AWS creds stay current
    setInterval(async () => {
      await refreshFargateCredentials();
      // Invalidate cached token so it is re-fetched on next query
      try { await authClient.getAccessToken(); } catch { /* will retry */ }
    }, CREDENTIAL_REFRESH_INTERVAL_MS);

  } else {
    // Local dev: use application default credentials or service account key file
    _bigquery = new BigQuery({
      projectId: BQ.project || undefined,
    });
  }

  console.log(`[bigquery] Client ready — project=${BQ.project || '(default)'}, dataset=${BQ.dataset}`);
  return _bigquery;
}

// ─── Query helper ─────────────────────────────────────────────────────────────

export async function runQuery<T extends object>(
  sql: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  const bq = await getBigQuery();
  const [rows] = await bq.query({
    query: sql,
    params,
    useLegacySql: false,
    location: process.env.BQ_LOCATION ?? 'US',
  });
  return rows as T[];
}
