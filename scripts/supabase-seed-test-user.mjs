import "./load-env.mjs";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node ./scripts/supabase-seed-test-user.mjs [--linked | --local] [--months 12] [--recreate]

Creates a deterministic test user from .env and seeds realistic finance data.

Examples:
  yarn supabase:db:seed:test --linked
  yarn supabase:db:seed:test --local
  yarn supabase:db:seed:test --linked --months 18
`);
  process.exit(0);
}

const hasLinked = args.includes("--linked");
const hasLocal = args.includes("--local");

if (hasLinked === hasLocal) {
  console.error("Choose exactly one target: --linked or --local.");
  process.exit(1);
}

const months = readNumberFlag(args, "--months", 12);

if (!Number.isInteger(months) || months <= 0) {
  console.error("--months must be a positive integer.");
  process.exit(1);
}

const target = hasLinked ? "linked" : "local";

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const env = readRequiredEnv();
  const authConfig = getAuthConfig(target);
  const { firstName, lastName } = splitFullName(env.fullName);

  console.log(`Target: ${target}`);
  console.log(`Preparing test user seed for ${env.email} with ${months} months of history...`);

  const existingUsers = await runDbQuery(target, `
    select id, email
    from auth.users
    where lower(email) = lower(${sqlString(env.email)});
  `);

  if (existingUsers.length > 0) {
    console.log(`Deleting existing test user rows for ${env.email}...`);
    await runDbQuery(
      target,
      `delete from auth.users where lower(email) = lower(${sqlString(env.email)});`,
    );
  }

  const supabase = createClient(authConfig.url, authConfig.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: env.email,
    password: env.password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (signUpError) {
    throw new Error(`Failed to create test user: ${signUpError.message}`);
  }

  const createdUserId = signUpData.user?.id;

  if (!createdUserId) {
    throw new Error("Supabase signUp did not return a user id.");
  }

  await runDbQuery(
    target,
    `
      update auth.users
      set
        email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now()))
      where id = ${sqlString(createdUserId)};
    `,
  );

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: env.email,
      password: env.password,
    });

  if (signInError) {
    throw new Error(`Failed to sign in test user after confirmation: ${signInError.message}`);
  }

  const session = signInData.session;
  const user = signInData.user;

  if (!session || !user) {
    throw new Error("Supabase signIn did not return a session.");
  }

  const userClient = createClient(authConfig.url, authConfig.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  });

  const seed = createSeedState(env.email);

  console.log("Loading bootstrap rows and catalog references...");

  const settings = await fetchSingleRow(userClient, "settings", "user_id", user.id);
  const categories = await fetchRows(userClient, "categories");
  const incomeSources = await fetchRows(userClient, "income_sources");

  await updateSettings(userClient, user.id, seed, settings.id);

  const wallets = await createWallets(userClient, user.id);
  const walletByName = createMapByName(wallets);

  const extraCategories = await addCategories(userClient, user.id);
  const extraIncomeSources = await addIncomeSources(userClient, user.id);

  const allCategories = [...categories, ...extraCategories];
  const allIncomeSources = [...incomeSources, ...extraIncomeSources];

  await updateInactiveFlags(userClient, user.id, allCategories, allIncomeSources);

  const categoryByName = createMapByName(allCategories);
  const incomeSourceByName = createMapByName(allIncomeSources);

  console.log("Seeding salary history, incomes, expenses, exchanges, commitments, wishes, and scores...");

  const monthStarts = buildMonthStarts(months);
  const recurringExpenses = await createRecurringExpenses(userClient, walletByName, categoryByName);
  const budgetProvisions = await createBudgetProvisions(
    userClient,
    walletByName,
    categoryByName,
    monthStarts,
  );
  const wishes = await createWishes(userClient, user.id, walletByName, monthStarts);

  await seedMonthlyHistory({
    categories: categoryByName,
    client: userClient,
    incomeSources: incomeSourceByName,
    monthStarts,
    recurringExpenses,
    budgetProvisions,
    seed,
    walletByName,
    wishes,
  });

  await markCommitmentsInactive(target, recurringExpenses, budgetProvisions);
  await seedFinancialScores(userClient, user.id, seed);
  await reconcileWallets(target, wallets);

  const summary = await buildSummary(userClient, user.id);

  console.log("");
  console.log("Seed completed.");
  console.log(JSON.stringify(summary, null, 2));
}

function readRequiredEnv() {
  const email = process.env.USER_TEST_EMAIL?.trim();
  const password = process.env.USER_TEST_PASSWORD?.trim();
  const fullName = process.env.USER_TEST_FULL_NAME?.trim();

  if (!email) {
    throw new Error("Missing USER_TEST_EMAIL in .env.");
  }

  if (!password) {
    throw new Error("Missing USER_TEST_PASSWORD in .env.");
  }

  if (!fullName) {
    throw new Error("Missing USER_TEST_FULL_NAME in .env.");
  }

  return { email, fullName, password };
}

function splitFullName(fullName) {
  const parts = fullName
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error("USER_TEST_FULL_NAME must contain at least one name.");
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "Test",
  };
}

function getAuthConfig(targetName) {
  if (targetName === "linked") {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!url) {
      throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL in .env for --linked.");
    }

    if (!anonKey) {
      throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in .env for --linked.");
    }

    return { anonKey, url };
  }

  const result = runCommand("npx", ["supabase", "status", "-o", "env"], {
    captureOutput: true,
  });

  if ((result.status ?? 1) !== 0) {
    const message = (result.stderr || result.stdout || "").trim();

    throw new Error(
      `Unable to read local Supabase status for --local. Make sure the local stack is running. ${message}`,
    );
  }

  const localEnv = parseEnvOutput(result.stdout || "");
  const url = localEnv.API_URL || localEnv.SUPABASE_URL;
  const anonKey = localEnv.ANON_KEY || localEnv.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      `Local Supabase status did not expose API_URL/ANON_KEY. Received keys: ${Object.keys(localEnv).join(", ")}`,
    );
  }

  return { anonKey, url };
}

function parseEnvOutput(output) {
  const env = {};

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || !line.includes("=")) {
      continue;
    }

    const separator = line.indexOf("=");
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    env[key] = value;
  }

  return env;
}

function readNumberFlag(values, flagName, defaultValue) {
  const index = values.indexOf(flagName);

  if (index === -1) {
    return defaultValue;
  }

  const rawValue = values[index + 1];

  if (!rawValue) {
    throw new Error(`Missing value for ${flagName}.`);
  }

  return Number.parseInt(rawValue, 10);
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function runDbQuery(targetName, sql) {
  const tempDir = mkdtempSync(join(tmpdir(), "finflow-iq-seed-"));
  const sqlPath = join(tempDir, "query.sql");

  writeFileSync(sqlPath, `${sql.trim()}\n`, "utf8");

  try {
    const args = [
      "supabase",
      "db",
      "query",
      targetName === "linked" ? "--linked" : "--local",
      "--file",
      sqlPath,
      "-o",
      "json",
    ];

    const result = runCommand("npx", args, {
      captureOutput: true,
      maxBuffer: 20 * 1024 * 1024,
    });

    if ((result.status ?? 1) !== 0) {
      const message = (result.stderr || result.stdout || "").trim();
      throw new Error(`supabase db query failed: ${message}`);
    }

    const stdout = (result.stdout || "").trim();

    if (!stdout) {
      return [];
    }

    return JSON.parse(stdout);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function runCommand(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: options.maxBuffer ?? 10 * 1024 * 1024,
    shell: true,
    stdio: options.captureOutput ? "pipe" : "inherit",
    windowsHide: true,
  });
}

async function fetchSingleRow(client, table, fieldName, value) {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq(fieldName, value)
    .single();

  if (error) {
    throw new Error(`Failed to fetch ${table}: ${error.message}`);
  }

  return data;
}

async function fetchRows(client, table) {
  const { data, error } = await client.from(table).select("*");

  if (error) {
    throw new Error(`Failed to fetch ${table}: ${error.message}`);
  }

  return data;
}

async function updateSettings(client, userId, seed, settingsId) {
  const primaryCurrency = seed.next() > 0.5 ? "USD" : "CUP";
  const usdCupRate = round2(320 + seed.next() * 45);
  const salaryReferenceAmount = primaryCurrency === "USD"
    ? round2(850 + seed.next() * 350)
    : round2(180000 + seed.next() * 50000);

  const { error } = await client
    .from("settings")
    .update({
      ai_analysis_frequency: "manual",
      alert_level: "normal",
      avg_months_without_payment: round1(0.5 + seed.next() * 1.7),
      date_format: "DD/MM/YYYY",
      financial_month_start_day: 1,
      primary_currency: primaryCurrency,
      salary_reference_amount: salaryReferenceAmount,
      savings_goal_percent: 22,
      session_timeout_minutes: 10,
      subscription_alert_days: 7,
      theme: "auto",
      usd_cup_rate: usdCupRate,
      weekly_summary_day: "monday",
    })
    .eq("id", settingsId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`);
  }
}

async function createWallets(client, userId) {
  const payload = [
    {
      color: "#0F766E",
      currency: "USD",
      icon: "wallet",
      is_active: true,
      name: "Billetera USD",
      position: 0,
      user_id: userId,
    },
    {
      color: "#1D4ED8",
      currency: "USD",
      icon: "credit-card",
      is_active: true,
      name: "Tarjeta USD",
      position: 1,
      user_id: userId,
    },
    {
      color: "#B45309",
      currency: "CUP",
      icon: "banknote",
      is_active: true,
      name: "Efectivo CUP",
      position: 2,
      user_id: userId,
    },
    {
      color: "#6D28D9",
      currency: "USD",
      icon: "piggy-bank",
      is_active: true,
      name: "Reserva Viaje",
      position: 3,
      user_id: userId,
    },
    {
      color: "#64748B",
      currency: "USD",
      icon: "archive",
      is_active: false,
      name: "Caja Archivada",
      position: 4,
      user_id: userId,
    },
  ];

  const { data, error } = await client.from("wallets").insert(payload).select("*");

  if (error) {
    throw new Error(`Failed to create wallets: ${error.message}`);
  }

  return data;
}

async function addCategories(client, userId) {
  const payload = [
    { color: "#E11D48", icon: "plane", is_active: true, is_default: false, name: "Viajes", user_id: userId },
    { color: "#0EA5E9", icon: "laptop", is_active: true, is_default: false, name: "Tecnologia", user_id: userId },
    { color: "#10B981", icon: "gift", is_active: false, is_default: false, name: "Regalos", user_id: userId },
    { color: "#F97316", icon: "dumbbell", is_active: true, is_default: false, name: "Fitness", user_id: userId },
  ];

  const { data, error } = await client.from("categories").insert(payload).select("*");

  if (error) {
    throw new Error(`Failed to create extra categories: ${error.message}`);
  }

  return data;
}

async function addIncomeSources(client, userId) {
  const payload = [
    { is_active: true, is_default: false, name: "Bonus", user_id: userId },
    { is_active: true, is_default: false, name: "Consultoria", user_id: userId },
    { is_active: false, is_default: false, name: "Reembolso", user_id: userId },
  ];

  const { data, error } = await client.from("income_sources").insert(payload).select("*");

  if (error) {
    throw new Error(`Failed to create extra income sources: ${error.message}`);
  }

  return data;
}

async function updateInactiveFlags(client, userId, categories, incomeSources) {
  const categoryToDeactivate = categories.find((item) => item.name === "Otro");
  const incomeSourceToDeactivate = incomeSources.find((item) => item.name === "Reembolso");

  if (categoryToDeactivate) {
    const { error } = await client
      .from("categories")
      .update({ is_active: false })
      .eq("id", categoryToDeactivate.id)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to deactivate category: ${error.message}`);
    }
  }

  if (incomeSourceToDeactivate) {
    const { error } = await client
      .from("income_sources")
      .update({ is_active: false })
      .eq("id", incomeSourceToDeactivate.id)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to deactivate income source: ${error.message}`);
    }
  }
}

async function createRecurringExpenses(client, walletByName, categoryByName) {
  const specs = [
    {
      amount: 15,
      billingDay: 6,
      billingMonth: null,
      category: "Servicios",
      frequency: "monthly",
      name: "Spotify Familiar",
      notes: "Suscripcion de musica",
      type: "subscription",
      wallet: "Tarjeta USD",
    },
    {
      amount: 55,
      billingDay: 12,
      billingMonth: null,
      category: "Servicios",
      frequency: "monthly",
      name: "Internet Hogar",
      notes: "Plan residencial",
      type: "fixed_expense",
      wallet: "Billetera USD",
    },
    {
      amount: 2800,
      billingDay: 18,
      billingMonth: null,
      category: "Hogar",
      frequency: "monthly",
      name: "Electricidad",
      notes: "Factura CUP",
      type: "fixed_expense",
      wallet: "Efectivo CUP",
    },
    {
      amount: 120,
      billingDay: 8,
      billingMonth: 7,
      category: "Salud",
      frequency: "yearly",
      name: "Seguro Medico",
      notes: "Pago anual",
      type: "fixed_expense",
      wallet: "Tarjeta USD",
    },
  ];

  const rows = [];

  for (const spec of specs) {
    const { data, error } = await client.rpc("create_recurring_expense", {
      committed_amount: spec.amount,
      expense_frequency: spec.frequency,
      expense_name: spec.name,
      expense_type: spec.type,
      target_billing_day: spec.billingDay,
      target_billing_month: spec.billingMonth,
      target_category_id: categoryByName[spec.category]?.id ?? null,
      target_notes: spec.notes,
      target_wallet_id: walletByName[spec.wallet].id,
    });

    if (error) {
      throw new Error(`Failed to create recurring expense "${spec.name}": ${error.message}`);
    }

    rows.push(data);
  }

  return rows;
}

async function createBudgetProvisions(client, walletByName, categoryByName, monthStarts) {
  const currentMonth = monthStarts[monthStarts.length - 1];
  const nextMonth = addMonthsUtc(currentMonth, 1);
  const specs = [
    {
      amount: 220,
      category: "Viajes",
      month: nextMonth,
      name: "Pasajes verano",
      notes: "Ahorro del viaje anual",
      recurrence: "yearly",
      wallet: "Reserva Viaje",
    },
    {
      amount: 35,
      category: "Tecnologia",
      month: currentMonth,
      name: "Mantenimiento laptop",
      notes: "Provision de equipo",
      recurrence: "once",
      wallet: "Tarjeta USD",
    },
    {
      amount: 4800,
      category: "Hogar",
      month: currentMonth,
      name: "Reparacion cocina",
      notes: "Provision local CUP",
      recurrence: "once",
      wallet: "Efectivo CUP",
    },
  ];

  const rows = [];

  for (const spec of specs) {
    const { data, error } = await client.rpc("create_budget_provision", {
      planned_amount: spec.amount,
      provision_name: spec.name,
      target_category_id: categoryByName[spec.category]?.id ?? null,
      target_month: formatDate(spec.month),
      target_notes: spec.notes,
      target_recurrence: spec.recurrence,
      target_wallet_id: walletByName[spec.wallet].id,
    });

    if (error) {
      throw new Error(`Failed to create budget provision "${spec.name}": ${error.message}`);
    }

    rows.push(data);
  }

  return rows;
}

async function createWishes(client, userId, walletByName, monthStarts) {
  const payload = [
    {
      confidence_level: "medium",
      confidence_reason: "Depende del flujo de ahorro trimestral.",
      estimated_amount: 780,
      estimated_purchase_date: formatDate(addMonthsUtc(monthStarts[monthStarts.length - 1], 3)),
      name: "Laptop nueva",
      notes: "Para trabajo y pruebas moviles.",
      priority: 1,
      user_id: userId,
      wallet_id: walletByName["Reserva Viaje"].id,
    },
    {
      confidence_level: "high",
      confidence_reason: "Ya casi esta cubierto por el presupuesto mensual.",
      estimated_amount: 145,
      estimated_purchase_date: formatDate(addMonthsUtc(monthStarts[monthStarts.length - 1], 1)),
      name: "Audifonos bluetooth",
      notes: "Reemplazo para uso diario.",
      priority: 2,
      user_id: userId,
      wallet_id: walletByName["Tarjeta USD"].id,
    },
    {
      confidence_level: "low",
      confidence_reason: "Se mueve segun la tasa del mercado.",
      estimated_amount: 32000,
      estimated_purchase_date: formatDate(addMonthsUtc(monthStarts[monthStarts.length - 1], 5)),
      name: "Telefono CUP",
      notes: "Compra local cuando haya oferta.",
      priority: 3,
      user_id: userId,
      wallet_id: walletByName["Efectivo CUP"].id,
    },
    {
      confidence_level: "high",
      confidence_reason: "Ya estaba planificado en el trimestre anterior.",
      estimated_amount: 52,
      estimated_purchase_date: formatDate(monthStarts[monthStarts.length - 1]),
      name: "Mochila compacta",
      notes: "Compra menor del mes.",
      priority: 4,
      user_id: userId,
      wallet_id: walletByName["Billetera USD"].id,
    },
  ];

  const { data, error } = await client.from("wishes").insert(payload).select("*");

  if (error) {
    throw new Error(`Failed to create wishes: ${error.message}`);
  }

  return data;
}

async function seedMonthlyHistory(context) {
  const {
    categories,
    client,
    incomeSources,
    monthStarts,
    recurringExpenses,
    budgetProvisions,
    seed,
    walletByName,
    wishes,
  } = context;

  const usdSalaryWallet = walletByName["Tarjeta USD"];
  const usdCashWallet = walletByName["Billetera USD"];
  const cupWallet = walletByName["Efectivo CUP"];
  const travelWallet = walletByName["Reserva Viaje"];

  for (let index = 0; index < monthStarts.length; index += 1) {
    const monthStart = monthStarts[index];
    const monthPattern = index % 6;
    const expectedUsd = round2(920 + index * 14 + seed.next() * 90);

    const usdPeriod = await callRpc(client, "create_salary_period", {
      expected_salary_amount: expectedUsd,
      target_currency: "USD",
      target_notes: `Plan salarial ${formatMonthLabel(monthStart)} USD`,
      target_period_month: formatDate(monthStart),
    });

    if (index % 3 === 0) {
      await callRpc(client, "create_salary_period", {
        expected_salary_amount: round2(18000 + index * 450 + seed.next() * 1500),
        target_currency: "CUP",
        target_notes: `Complemento salarial ${formatMonthLabel(monthStart)} CUP`,
        target_period_month: formatDate(monthStart),
      });
    }

    if (monthPattern === 0) {
      await callRpc(client, "register_salary_payment", {
        allocation_amounts: [],
        allocation_period_ids: [],
        payment_amount: round2(expectedUsd * 0.35),
        payment_currency: "USD",
        payment_description: `Anticipo libre ${formatMonthLabel(monthStart)}`,
        target_payment_date: formatDate(dayInMonth(monthStart, 3)),
        target_wallet_id: usdSalaryWallet.id,
      });
    } else if (monthPattern === 1) {
      await callRpc(client, "register_salary_payment", {
        allocation_amounts: [round2(expectedUsd * 0.55)],
        allocation_period_ids: [usdPeriod.id],
        payment_amount: round2(expectedUsd * 0.8),
        payment_currency: "USD",
        payment_description: `Salario parcial ${formatMonthLabel(monthStart)}`,
        target_payment_date: formatDate(dayInMonth(monthStart, 5)),
        target_wallet_id: usdSalaryWallet.id,
      });
    } else {
      await callRpc(client, "register_salary_payment", {
        allocation_amounts: [expectedUsd],
        allocation_period_ids: [usdPeriod.id],
        payment_amount: expectedUsd,
        payment_currency: "USD",
        payment_description: `Salario mensual ${formatMonthLabel(monthStart)}`,
        target_payment_date: formatDate(dayInMonth(monthStart, 5)),
        target_wallet_id: usdSalaryWallet.id,
      });
    }

    await callRpc(client, "create_manual_income", {
      entry_date: formatDate(dayInMonth(monthStart, 9)),
      entry_description: `Freelance ${formatMonthLabel(monthStart)}`,
      gross_amount: round2(80 + seed.next() * 160),
      target_income_source_id: incomeSources.Freelance.id,
      target_wallet_id: usdCashWallet.id,
    });

    if (index % 2 === 0) {
      await callRpc(client, "create_manual_income", {
        entry_date: formatDate(dayInMonth(monthStart, 11)),
        entry_description: `Consultoria ${formatMonthLabel(monthStart)}`,
        gross_amount: round2(120 + seed.next() * 90),
        target_income_source_id: incomeSources.Consultoria.id,
        target_wallet_id: usdCashWallet.id,
      });
    }

    if (index % 4 === 0) {
      await callRpc(client, "create_manual_income", {
        entry_date: formatDate(dayInMonth(monthStart, 14)),
        entry_description: `Bonus ${formatMonthLabel(monthStart)}`,
        gross_amount: round2(70 + seed.next() * 130),
        target_income_source_id: incomeSources.Bonus.id,
        target_wallet_id: usdSalaryWallet.id,
      });
    }

    await callRpc(client, "create_manual_income", {
      entry_date: formatDate(dayInMonth(monthStart, 7)),
      entry_description: `Venta local ${formatMonthLabel(monthStart)}`,
      gross_amount: round2(3500 + seed.next() * 4000),
      target_income_source_id: incomeSources.Venta.id,
      target_wallet_id: cupWallet.id,
    });

    await callRpc(client, "create_expense", {
      entry_date: formatDate(dayInMonth(monthStart, 10)),
      entry_description: `Supermercado ${formatMonthLabel(monthStart)}`,
      gross_amount: round2(95 + seed.next() * 90),
      target_category_id: categories.Comida.id,
      target_wallet_id: usdCashWallet.id,
    });

    await callRpc(client, "create_expense", {
      entry_date: formatDate(dayInMonth(monthStart, 16)),
      entry_description: `Transporte ${formatMonthLabel(monthStart)}`,
      gross_amount: round2(18 + seed.next() * 25),
      target_category_id: categories.Transporte.id,
      target_wallet_id: usdCashWallet.id,
    });

    await callRpc(client, "create_expense", {
      entry_date: formatDate(dayInMonth(monthStart, 22)),
      entry_description: `Mercado local ${formatMonthLabel(monthStart)}`,
      gross_amount: round2(2500 + seed.next() * 2800),
      target_category_id: categories.Hogar.id,
      target_wallet_id: cupWallet.id,
    });

    if (index % 3 === 0) {
      await callRpc(client, "create_expense", {
        entry_date: formatDate(dayInMonth(monthStart, 24)),
        entry_description: `Gimnasio ${formatMonthLabel(monthStart)}`,
        gross_amount: round2(25 + seed.next() * 20),
        target_category_id: categories.Fitness.id,
        target_wallet_id: usdCashWallet.id,
      });
    }

    if (index % 4 === 1) {
      await callRpc(client, "create_adjustment", {
        entry_date: formatDate(dayInMonth(monthStart, 27)),
        entry_description: `Ajuste por redondeo ${formatMonthLabel(monthStart)}`,
        signed_amount: round2((seed.next() > 0.5 ? 1 : -1) * (5 + seed.next() * 18)),
        target_wallet_id: usdCashWallet.id,
      });
    }

    if (index % 2 === 0) {
      const sourceAmount = round2(110 + seed.next() * 120);
      const rate = roundRate(320 + seed.next() * 35);
      const destinationAmount = round2(sourceAmount * rate);

      await callRpc(client, "transfer_between_wallets", {
        destination_amount: destinationAmount,
        destination_wallet_id: cupWallet.id,
        quoted_exchange_rate: rate,
        source_amount: sourceAmount,
        source_wallet_id: usdSalaryWallet.id,
        target_transfer_date: formatDate(dayInMonth(monthStart, 6)),
        transfer_description: `Cambio operativo ${formatMonthLabel(monthStart)}`,
      });
    }

    if (index % 5 === 2) {
      await callRpc(client, "transfer_between_wallets", {
        destination_amount: round2(60),
        destination_wallet_id: travelWallet.id,
        quoted_exchange_rate: roundRate(1),
        source_amount: round2(60),
        source_wallet_id: usdSalaryWallet.id,
        target_transfer_date: formatDate(dayInMonth(monthStart, 13)),
        transfer_description: `Reserva de viaje ${formatMonthLabel(monthStart)}`,
      });
    }

    await settleRecurringForMonth(client, recurringExpenses, monthStart);
    await settleProvisionsForMonth(client, budgetProvisions, monthStart, index);

    if (index === monthStarts.length - 7) {
      await callRpc(client, "create_wish_purchase_expense", {
        entry_date: formatDate(dayInMonth(monthStart, 20)),
        entry_description: "Compra de mochila compacta",
        gross_amount: 52,
        target_category_id: categories.Viajes.id,
        target_wallet_id: usdCashWallet.id,
        target_wish_id: wishes.find((item) => item.name === "Mochila compacta").id,
      });
    }

    if (index === monthStarts.length - 2) {
      await callRpc(client, "create_wish_purchase_expense", {
        entry_date: formatDate(dayInMonth(monthStart, 19)),
        entry_description: "Compra de audifonos bluetooth",
        gross_amount: 148,
        target_category_id: categories.Tecnologia.id,
        target_wallet_id: usdSalaryWallet.id,
        target_wish_id: wishes.find((item) => item.name === "Audifonos bluetooth").id,
      });
    }

    if (index === monthStarts.length - 4) {
      await callRpc(client, "create_expense", {
        entry_date: formatDate(dayInMonth(monthStart, 25)),
        entry_description: `Mantenimiento en servicios ${formatMonthLabel(monthStart)}`,
        gross_amount: round2(40 + seed.next() * 30),
        target_category_id: categories.Servicios.id,
        target_wallet_id: usdCashWallet.id,
      });
    }
  }
}

async function settleRecurringForMonth(client, recurringExpenses, monthStart) {
  for (const expense of recurringExpenses) {
    if (expense.frequency === "yearly" && expense.billing_month !== monthStart.getUTCMonth() + 1) {
      continue;
    }

    await callRpc(client, "settle_recurring_expense", {
      payment_amount: expense.amount,
      payment_description: `${expense.name} ${formatMonthLabel(monthStart)}`,
      target_payment_date: formatDate(dayInMonth(monthStart, Math.min(expense.billing_day, 28))),
      target_recurring_expense_id: expense.id,
    });
  }
}

async function settleProvisionsForMonth(client, budgetProvisions, monthStart, monthIndex) {
  for (const provision of budgetProvisions) {
    const provisionMonth = startOfMonthUtc(new Date(provision.month));
    const sameMonth = provisionMonth.getUTCFullYear() === monthStart.getUTCFullYear() &&
      provisionMonth.getUTCMonth() === monthStart.getUTCMonth();

    if (!sameMonth) {
      continue;
    }

    const ratio = monthIndex % 2 === 0 ? 0.55 : 1;
    const amount = round2(provision.amount * ratio);

    await callRpc(client, "settle_budget_provision", {
      payment_amount: amount,
      payment_description: `${provision.name} ${formatMonthLabel(monthStart)}`,
      target_budget_provision_id: provision.id,
      target_payment_date: formatDate(dayInMonth(monthStart, 26)),
    });
  }
}

async function markCommitmentsInactive(targetName, recurringExpenses, budgetProvisions) {
  const recurringToDeactivate = recurringExpenses
    .filter((row) => row.name === "Seguro Medico")
    .map((row) => row.id);
  const provisionsToDeactivate = budgetProvisions
    .filter((row) => row.name === "Reparacion cocina")
    .map((row) => row.id);

  if (recurringToDeactivate.length > 0) {
    await runDbQuery(
      targetName,
      `
        update public.recurring_expenses
        set is_active = false
        where id = any(array[${recurringToDeactivate.map(sqlString).join(", ")}]::uuid[]);
      `,
    );
  }

  if (provisionsToDeactivate.length > 0) {
    await runDbQuery(
      targetName,
      `
        update public.budget_provisions
        set is_active = false
        where id = any(array[${provisionsToDeactivate.map(sqlString).join(", ")}]::uuid[]);
      `,
    );
  }
}

async function seedFinancialScores(client, userId, seed) {
  const startOfWeek = mondayOfWeek(new Date());
  const rows = [];

  for (let offset = 51; offset >= 0; offset -= 1) {
    const weekStart = addDaysUtc(startOfWeek, offset * -7);
    const baseScore = 58 + ((51 - offset) % 9) * 3 + Math.round(seed.next() * 6);
    const score = clamp(baseScore, 42, 94);
    const expenseDiscipline = clamp(score - 6 + Math.round(seed.next() * 8), 35, 95);
    const savingsHabit = clamp(score - 4 + Math.round(seed.next() * 10), 35, 95);
    const incomeStability = clamp(score + Math.round(seed.next() * 8), 40, 98);
    const liquidity = clamp(score - 2 + Math.round(seed.next() * 12), 30, 98);

    rows.push({
      ai_tip: buildAiTip(score),
      breakdown: {
        expense_discipline: expenseDiscipline,
        income_stability: incomeStability,
        liquidity,
        savings_habit: savingsHabit,
      },
      score,
      user_id: userId,
      week_start: formatDate(weekStart),
    });
  }

  const { error } = await client.from("financial_scores").insert(rows);

  if (error) {
    throw new Error(`Failed to insert financial scores: ${error.message}`);
  }
}

async function reconcileWallets(targetName, wallets) {
  for (const wallet of wallets) {
    await runDbQuery(
      targetName,
      `
        update public.wallets as w
        set
          balance = totals.total_amount,
          updated_at = timezone('utc', now())
        from (
          select
            ${sqlString(wallet.id)}::uuid as target_wallet_id,
            coalesce(sum(le.amount), 0) as total_amount
          from public.ledger_entries as le
          where le.wallet_id = ${sqlString(wallet.id)}::uuid
        ) as totals
        where w.id = totals.target_wallet_id;
      `,
    );
  }
}

async function buildSummary(client, userId) {
  const tables = [
    "profiles",
    "settings",
    "wallets",
    "categories",
    "income_sources",
    "ledger_entries",
    "salary_periods",
    "salary_payments",
    "salary_allocations",
    "currency_exchanges",
    "recurring_expenses",
    "budget_provisions",
    "wishes",
    "financial_scores",
  ];

  const counts = {};

  for (const table of tables) {
    const { count, error } = await client
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(`Failed to count ${table}: ${error.message}`);
    }

    counts[table] = count ?? 0;
  }

  const { data: wallets, error: walletError } = await client
    .from("wallets")
    .select("id, name, currency, balance, is_active")
    .order("position");

  if (walletError) {
    throw new Error(`Failed to fetch wallet summary: ${walletError.message}`);
  }

  const { data: salaryPeriods, error: salaryPeriodError } = await client
    .from("salary_periods")
    .select("status");

  if (salaryPeriodError) {
    throw new Error(`Failed to fetch salary period states: ${salaryPeriodError.message}`);
  }

  const { data: salaryPayments, error: salaryPaymentError } = await client
    .from("salary_payments")
    .select("status");

  if (salaryPaymentError) {
    throw new Error(`Failed to fetch salary payment states: ${salaryPaymentError.message}`);
  }

  const { data: wishes, error: wishError } = await client
    .from("wishes")
    .select("name, is_purchased")
    .order("priority");

  if (wishError) {
    throw new Error(`Failed to fetch wishes summary: ${wishError.message}`);
  }

  return {
    counts,
    months_seeded: months,
    salary_payment_states: tallyByKey(salaryPayments, "status"),
    salary_period_states: tallyByKey(salaryPeriods, "status"),
    user_id: userId,
    wallets,
    wishes,
  };
}

async function callRpc(client, name, payload) {
  const { data, error } = await client.rpc(name, payload);

  if (error) {
    throw new Error(`RPC ${name} failed: ${error.message}`);
  }

  return data;
}

function createMapByName(rows) {
  return Object.fromEntries(rows.map((row) => [row.name, row]));
}

function createSeedState(input) {
  const seedBuilder = xmur3(input);
  const generator = mulberry32(seedBuilder());

  return {
    next() {
      return generator();
    },
  };
}

function xmur3(value) {
  let hash = 1779033703 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return function nextHash() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

function mulberry32(seedValue) {
  return function nextRandom() {
    let value = (seedValue += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMonthStarts(totalMonths) {
  const currentMonth = startOfMonthUtc(new Date());
  const rows = [];

  for (let index = totalMonths - 1; index >= 0; index -= 1) {
    rows.push(addMonthsUtc(currentMonth, index * -1));
  }

  return rows;
}

function startOfMonthUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUtc(date, monthOffset) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
}

function addDaysUtc(date, dayOffset) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + dayOffset));
}

function dayInMonth(monthStart, dayNumber) {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), dayNumber));
}

function mondayOfWeek(date) {
  const utcDay = date.getUTCDay();
  const diff = utcDay === 0 ? -6 : 1 - utcDay;
  return startOfDayUtc(addDaysUtc(date, diff));
}

function startOfDayUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("es-ES", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function roundRate(value) {
  return Math.round(value * 1000000) / 1000000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function tallyByKey(rows, key) {
  return rows.reduce((accumulator, row) => {
    const value = row[key];
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

function buildAiTip(score) {
  if (score >= 85) {
    return "Tu flujo semanal esta muy estable; mantén la reserva y evita subir gastos fijos.";
  }

  if (score >= 70) {
    return "La semana fue saludable; una transferencia adicional al ahorro puede empujar el score.";
  }

  if (score >= 55) {
    return "Hay equilibrio, pero conviene ajustar gastos variables y proteger liquidez para el cierre de mes.";
  }

  return "Prioriza liquidez y recorta consumo discrecional antes de asumir nuevos compromisos.";
}
