import "./load-env.mjs";

import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node ./scripts/supabase-ai-smoke.mjs --linked [--keep]

Runs a repeatable end-to-end smoke test for the active AI scopes:
- weekly_summary
- wish_advice
- dashboard_health

What it does:
1. Finds one existing linked user with an active wallet.
2. Inserts temporary score/wish rows.
3. Enqueues AI jobs directly in ai_jobs with valid snapshots.
4. Calls process-financial-ai.
5. Verifies completed insights and cache updates.
6. Cleans up temporary rows unless --keep is provided.

Examples:
  node ./scripts/supabase-ai-smoke.mjs --linked
  yarn supabase:ai:smoke
  yarn supabase:ai:smoke -- --keep
`);
  process.exit(0);
}

if (!args.includes("--linked")) {
  console.error("This smoke test currently supports only --linked.");
  process.exit(1);
}

const keepArtifacts = args.includes("--keep");
const runId = `ai_smoke_${Date.now()}_${randomUUID().slice(0, 8)}`;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const env = readRequiredEnv();
  const artifacts = {
    financialScoreId: null,
    jobIds: [],
    wishId: null,
  };

  console.log(`Smoke run: ${runId}`);
  console.log("Selecting a linked user with an active wallet...");

  try {
    const userContext = await getCandidateUserContext();

    console.log(`Using user ${userContext.user_id} and wallet ${userContext.wallet_id}.`);
    console.log("Creating temporary rows for weekly_summary and wish_advice cache validation...");

    const financialScoreId = await insertTemporaryFinancialScore(userContext.user_id);
    const wishId = await insertTemporaryWish({
      userId: userContext.user_id,
      walletId: userContext.wallet_id,
    });

    artifacts.financialScoreId = financialScoreId;
    artifacts.wishId = wishId;

    const snapshots = buildSnapshots({
      userId: userContext.user_id,
      wishId,
      walletCurrency: userContext.wallet_currency,
    });

    console.log("Inserting AI jobs...");

    const jobIds = await insertJobs({
      runId,
      snapshots,
      userId: userContext.user_id,
      wishId,
    });

    artifacts.jobIds = jobIds;

    console.log("Processing AI jobs...");

    await processJobs(env, 10);

    const results = await waitForResults(jobIds);

    validateResults(results);

    const cacheRows = await fetchCacheRows({
      financialScoreId,
      wishId,
    });

    validateCaches(cacheRows);

    console.log("");
    console.log("AI smoke test passed.");
    console.log(
      JSON.stringify(
        {
          caches: cacheRows,
          jobs: results.map((item) => ({
            insightStatus: item.insight_status,
            inputTokens: item.input_tokens,
            jobId: item.job_id,
            model: item.job_model,
            outputText: item.output_text,
            outputTokens: item.output_tokens,
            provider: item.job_provider,
            scope: item.scope,
          })),
          runId,
        },
        null,
        2,
      ),
    );
  } finally {
    if (!keepArtifacts) {
      console.log("Cleaning up temporary AI smoke rows...");
      await cleanupArtifacts(artifacts);
    }
  }
}

function readRequiredEnv() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const dbPassword = process.env.SUPABASE_PASSWORD?.trim();
  const cronSecret = process.env.PROCESS_FINANCIAL_AI_CRON_SECRET?.trim();

  if (!url) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL in .env.");
  }

  if (!anonKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.");
  }

  if (!dbPassword) {
    throw new Error("Missing SUPABASE_PASSWORD in .env.");
  }

  if (!cronSecret) {
    throw new Error("Missing PROCESS_FINANCIAL_AI_CRON_SECRET in .env.");
  }

  return {
    anonKey,
    cronSecret,
    dbPassword,
    url: url.replace(/\/+$/, ""),
  };
}

async function getCandidateUserContext() {
  const rows = await runLinkedDbQuery(`
    select
      u.id as user_id,
      w.id as wallet_id,
      w.currency as wallet_currency
    from auth.users as u
    join public.wallets as w
      on w.user_id = u.id
     and w.is_active = true
    order by u.created_at asc, w.position asc
    limit 1;
  `);

  const row = rows[0];

  if (!row?.user_id || !row?.wallet_id || !row?.wallet_currency) {
    throw new Error(
      "No linked user with an active wallet was found. Seed one first, for example with `yarn supabase:db:seed:test --linked`.",
    );
  }

  return row;
}

async function insertTemporaryFinancialScore(userId) {
  const id = randomUUID();

  await runLinkedDbQuery(`
    insert into public.financial_scores (
      id,
      user_id,
      score,
      week_start,
      breakdown,
      ai_tip
    ) values (
      ${sqlString(id)}::uuid,
      ${sqlString(userId)}::uuid,
      71,
      '2099-01-05',
      ${sqlString(
        JSON.stringify({
          expense_discipline: 70,
          income_stability: 76,
          liquidity: 69,
          savings_habit: 68,
          wishlist_pressure_score: 59,
        }),
      )}::jsonb,
      null
    );
  `);

  return id;
}

async function insertTemporaryWish(args) {
  const id = randomUUID();

  await runLinkedDbQuery(`
    insert into public.wishes (
      id,
      user_id,
      wallet_id,
      name,
      estimated_amount,
      priority,
      notes,
      estimated_purchase_date,
      confidence_level,
      confidence_reason,
      is_purchased,
      ai_advice
    ) values (
      ${sqlString(id)}::uuid,
      ${sqlString(args.userId)}::uuid,
      ${sqlString(args.walletId)}::uuid,
      ${sqlString(`AI Smoke Wish ${runId}`)},
      180,
      99,
      'Temporary wish created by supabase-ai-smoke.mjs',
      '2099-02-01',
      'medium',
      'Temporary smoke test fixture',
      false,
      null
    );
  `);

  return id;
}

function buildSnapshots(args) {
  const now = new Date().toISOString();
  const currency = args.walletCurrency === "CUP" ? "CUP" : "USD";
  const baseSummary = {
    assignableAmount: 220,
    availableBalance: 980,
    committedAmount: 760,
    financialScore: 74,
    pendingSalaryAmount: 180,
    reserveAmount: 320,
  };
  const sharedWish = {
    confidenceLevel: "medium",
    confidenceReason: "Todavia depende de mantener liquidez estable.",
    estimatedAmount: 180,
    estimatedPurchaseDate: "2099-02-01",
    id: args.wishId,
    impactOnAssignableAmount: 40,
    isCompetingWithCommitments: false,
    isShortTermViable: true,
    name: `AI Smoke Wish ${runId}`,
    notes: "Temporary wish created by supabase-ai-smoke.mjs",
    priority: 99,
  };

  return {
    dashboard_health: {
      analysisReason: "ai_smoke_dashboard_health",
      commitments: {
        activeProvisionCount: 1,
        activeRecurringCount: 2,
        monthlyCommitted: 760,
        monthlyPaid: 360,
        monthlyRemaining: 400,
      },
      generatedAt: now,
      salary: {
        lastPaymentDate: now.slice(0, 10),
        monthlyIncomeEstimate: 1300,
        monthsWithoutPayment: 0,
        pendingSalaryAmount: 180,
        totalAllocated: 1300,
        totalReceived: 1120,
      },
      scope: "dashboard_health",
      settings: {
        aiAnalysisFrequency: "each_transaction",
        alertLevel: "normal",
        avgMonthsWithoutPayment: 0.3,
        salaryReferenceAmount: 1300,
        savingsGoalPercent: 20,
        weeklySummaryDay: "monday",
      },
      summary: {
        ...baseSummary,
        monthlyCommitmentAverage: 760,
        monthlyIncome: 1300,
        previousFinancialScore: 70,
        scoreDelta: 4,
        totalWishEstimated: 180,
      },
      trend: {
        balanceTrend: "stable",
        last4WeeksScores: [66, 69, 70, 74],
        scoreTrend: "up",
        wishlistPressureTrend: "stable",
      },
      user: {
        id: args.userId,
        primaryCurrency: currency,
      },
      version: 1,
      wallets: [
        {
          balance: 980,
          currency,
          id: randomUUID(),
          isActive: true,
          name: "AI Smoke Wallet",
        },
      ],
      wishlist: {
        items: [],
        pressureLevel: "medium",
        totalActiveWishes: 1,
      },
    },
    weekly_summary: {
      analysisReason: "ai_smoke_weekly_summary",
      commitments: {
        activeProvisionCount: 1,
        activeRecurringCount: 2,
        monthlyCommitted: 760,
        monthlyPaid: 360,
        monthlyRemaining: 400,
      },
      generatedAt: now,
      salary: {
        lastPaymentDate: now.slice(0, 10),
        monthlyIncomeEstimate: 1300,
        monthsWithoutPayment: 0,
        pendingSalaryAmount: 180,
        totalAllocated: 1300,
        totalReceived: 1120,
      },
      scope: "weekly_summary",
      settings: {
        aiAnalysisFrequency: "each_transaction",
        alertLevel: "normal",
        avgMonthsWithoutPayment: 0.3,
        salaryReferenceAmount: 1300,
        savingsGoalPercent: 20,
        weeklySummaryDay: "monday",
      },
      summary: {
        ...baseSummary,
        monthlyCommitmentAverage: 760,
        monthlyIncome: 1300,
        previousFinancialScore: 70,
        scoreDelta: 4,
        totalWishEstimated: 180,
      },
      trend: {
        balanceTrend: "stable",
        last4WeeksScores: [66, 69, 70, 74],
        scoreTrend: "up",
        wishlistPressureTrend: "stable",
      },
      user: {
        id: args.userId,
        primaryCurrency: currency,
      },
      version: 1,
      wallets: [
        {
          balance: 980,
          currency,
          id: randomUUID(),
          isActive: true,
          name: "AI Smoke Wallet",
        },
      ],
      wishlist: {
        items: [sharedWish],
        pressureLevel: "medium",
        totalActiveWishes: 1,
      },
    },
    wish_advice: {
      analysisReason: "ai_smoke_wish_advice",
      commitments: {
        monthlyCommitted: 760,
        monthlyRemaining: 400,
      },
      generatedAt: now,
      otherWishes: [
        {
          estimatedAmount: 90,
          id: randomUUID(),
          name: "Soporte para laptop",
          priority: 5,
        },
      ],
      scope: "wish_advice",
      settings: {
        aiAnalysisFrequency: "each_transaction",
        avgMonthsWithoutPayment: 0.3,
        salaryReferenceAmount: 1300,
        savingsGoalPercent: 20,
      },
      summary: {
        ...baseSummary,
      },
      user: {
        id: args.userId,
        primaryCurrency: currency,
      },
      version: 1,
      wish: sharedWish,
    },
  };
}

async function insertJobs(args) {
  const weeklyJobId = randomUUID();
  const dashboardJobId = randomUUID();
  const wishJobId = randomUUID();

  await runLinkedDbQuery(`
    insert into public.ai_jobs (
      id,
      user_id,
      scope,
      scope_id,
      trigger_source,
      snapshot_fingerprint,
      input_snapshot,
      status,
      attempts,
      max_attempts,
      priority
    ) values
    (
      ${sqlString(weeklyJobId)}::uuid,
      ${sqlString(args.userId)}::uuid,
      'weekly_summary',
      null,
      ${sqlString(args.runId)},
      ${sqlString(`weekly_${args.runId}`)},
      ${sqlString(JSON.stringify(args.snapshots.weekly_summary))}::jsonb,
      'pending',
      0,
      3,
      10000
    ),
    (
      ${sqlString(dashboardJobId)}::uuid,
      ${sqlString(args.userId)}::uuid,
      'dashboard_health',
      null,
      ${sqlString(args.runId)},
      ${sqlString(`dashboard_${args.runId}`)},
      ${sqlString(JSON.stringify(args.snapshots.dashboard_health))}::jsonb,
      'pending',
      0,
      3,
      10000
    ),
    (
      ${sqlString(wishJobId)}::uuid,
      ${sqlString(args.userId)}::uuid,
      'wish_advice',
      ${sqlString(args.wishId)}::uuid,
      ${sqlString(args.runId)},
      ${sqlString(`wish_${args.runId}`)},
      ${sqlString(JSON.stringify(args.snapshots.wish_advice))}::jsonb,
      'pending',
      0,
      3,
      10000
    );
  `);

  return [weeklyJobId, dashboardJobId, wishJobId];
}

async function processJobs(env, batchSize) {
  const response = await fetch(`${env.url}/functions/v1/process-financial-ai`, {
    body: JSON.stringify({ batchSize }),
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${env.anonKey}`,
      "Content-Type": "application/json",
      "x-finflow-cron-secret": env.cronSecret,
    },
    method: "POST",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      `process-financial-ai failed with status ${response.status}: ${JSON.stringify(payload)}`,
    );
  }

  return payload;
}

async function waitForResults(jobIds) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rows = await runLinkedDbQuery(`
      select
        jobs.id as job_id,
        jobs.scope,
        jobs.status as job_status,
        jobs.provider as job_provider,
        jobs.model as job_model,
        jobs.last_error,
        insights.id as insight_id,
        insights.status as insight_status,
        insights.provider as insight_provider,
        insights.model as insight_model,
        insights.input_tokens,
        insights.output_tokens,
        insights.output_text
      from public.ai_jobs as jobs
      left join public.ai_insights as insights
        on insights.job_id = jobs.id
      where jobs.id = any(array[${jobIds.map((id) => `${sqlString(id)}::uuid`).join(", ")}])
      order by jobs.scope asc;
    `);

    const allFinished =
      rows.length === jobIds.length &&
      rows.every(
        (row) =>
          (row.job_status === "completed" || row.job_status === "dead_letter") &&
          row.insight_id,
      );

    if (allFinished) {
      return rows;
    }

    await delay(2000);
  }

  const rows = await runLinkedDbQuery(`
    select
      jobs.id as job_id,
      jobs.scope,
      jobs.status as job_status,
      jobs.provider as job_provider,
      jobs.model as job_model,
      jobs.last_error,
      insights.id as insight_id,
      insights.status as insight_status,
      insights.provider as insight_provider,
      insights.model as insight_model,
      insights.input_tokens,
      insights.output_tokens,
      insights.output_text
    from public.ai_jobs as jobs
    left join public.ai_insights as insights
      on insights.job_id = jobs.id
    where jobs.id = any(array[${jobIds.map((id) => `${sqlString(id)}::uuid`).join(", ")}])
    order by jobs.scope asc;
  `);

  return rows;
}

function validateResults(rows) {
  if (rows.length !== 3) {
    throw new Error(`Expected 3 AI job rows, received ${rows.length}.`);
  }

  const invalidRows = rows.filter(
    (row) =>
      row.job_status !== "completed" ||
      row.insight_status !== "completed" ||
      !row.output_text ||
      !row.job_provider ||
      !row.job_model,
  );

  if (invalidRows.length > 0) {
    throw new Error(`AI smoke test failed:\n${JSON.stringify(invalidRows, null, 2)}`);
  }
}

async function fetchCacheRows(args) {
  const rows = await runLinkedDbQuery(`
    select
      (
        select ai_tip
        from public.financial_scores
        where id = ${sqlString(args.financialScoreId)}::uuid
      ) as ai_tip,
      (
        select ai_advice
        from public.wishes
        where id = ${sqlString(args.wishId)}::uuid
      ) as ai_advice,
      (
        select last_ai_advice_at
        from public.wishes
        where id = ${sqlString(args.wishId)}::uuid
      ) as last_ai_advice_at;
  `);

  return rows[0] ?? null;
}

function validateCaches(cacheRow) {
  if (!cacheRow?.ai_tip) {
    throw new Error("weekly_summary did not update financial_scores.ai_tip.");
  }

  if (!cacheRow?.ai_advice) {
    throw new Error("wish_advice did not update wishes.ai_advice.");
  }

  if (!cacheRow?.last_ai_advice_at) {
    throw new Error("wish_advice did not update wishes.last_ai_advice_at.");
  }
}

async function cleanupArtifacts(artifacts) {
  const clauses = [];

  if (artifacts.jobIds.length > 0) {
    clauses.push(`
      delete from public.ai_insights
      where job_id = any(array[${artifacts.jobIds.map((id) => `${sqlString(id)}::uuid`).join(", ")}]);
    `);
    clauses.push(`
      delete from public.ai_jobs
      where id = any(array[${artifacts.jobIds.map((id) => `${sqlString(id)}::uuid`).join(", ")}]);
    `);
  }

  if (artifacts.wishId) {
    clauses.push(`
      delete from public.wishes
      where id = ${sqlString(artifacts.wishId)}::uuid;
    `);
  }

  if (artifacts.financialScoreId) {
    clauses.push(`
      delete from public.financial_scores
      where id = ${sqlString(artifacts.financialScoreId)}::uuid;
    `);
  }

  if (clauses.length === 0) {
    return;
  }

  await runLinkedDbQuery(clauses.join("\n"));
}

async function runLinkedDbQuery(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), "finflow-iq-ai-smoke-"));
  const sqlPath = join(tempDir, "query.sql");

  try {
    writeFileSync(sqlPath, `${sql.trim()}\n`, "utf8");

    const result = runCommand("npx", [
      "supabase",
      "db",
      "query",
      "--linked",
      "--file",
      sqlPath,
      "-o",
      "json",
    ]);

    if ((result.status ?? 1) !== 0) {
      const message = (result.stderr || result.stdout || "").trim();
      throw new Error(`supabase db query failed: ${message}`);
    }

    const stdout = (result.stdout || "").trim();

    if (!stdout) {
      return [];
    }

    const parsed = JSON.parse(stdout);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed.rows)) {
      return parsed.rows;
    }

    return [];
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function runCommand(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_DB_PASSWORD: process.env.SUPABASE_PASSWORD,
    },
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
    stdio: "pipe",
    windowsHide: true,
  });
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
