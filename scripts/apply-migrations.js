/**
 * apply-migrations.js
 * Attempts to apply pending Supabase migrations via every available HTTP
 * endpoint. If none work (service-role JWTs cannot execute DDL over REST),
 * prints the exact SQL and dashboard URL for manual execution.
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://lorrugedmqbjrxodxgdh.supabase.co';
const PROJECT_REF = 'lorrugedmqbjrxodxgdh';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvcnJ1Z2VkbXFianJ4b2R4Z2RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzE2NywiZXhwIjoyMDg4NjUzMTY3fQ.GdD4B907alQ4sMWZtfWA6UqyS4JSW9PhiUjVvHYsS7U';

const MIGRATION_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const MIGRATION_FILES = [
  '002_provincial_assembly.sql',
  '003_add_turnout_invalid_votes.sql',
  '004_add_is_final.sql',
];

// ── helpers ──────────────────────────────────────────────────────────
function readMigration(filename) {
  return fs.readFileSync(path.join(MIGRATION_DIR, filename), 'utf8');
}

async function tableExists(tableName) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=0`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.ok;
}

async function columnExists(tableName, columnName) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${tableName}?select=${columnName}&limit=0`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  return res.ok;
}

/** Try executing SQL via various Supabase HTTP endpoints */
async function execSqlHttp(sql, label) {
  const endpoints = [
    // Management API
    {
      url: `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      body: { query: sql },
    },
    // Project-level SQL endpoints (Studio internal)
    { url: `${SUPABASE_URL}/pg/query`, body: { query: sql } },
    { url: `${SUPABASE_URL}/pg`, body: { query: sql } },
    { url: `${SUPABASE_URL}/sql`, body: { query: sql } },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(ep.body),
      });
      if (res.ok) {
        console.log(`  ✅ ${label} — applied via ${ep.url}`);
        return true;
      }
    } catch (_) {
      // network error — try next
    }
  }
  return false;
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Nepal Election Live — Apply Pending Migrations     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── Pre-flight check ──
  console.log('Checking current migration state via PostgREST…\n');

  const checks = await Promise.all([
    tableExists('pa_constituencies'),
    columnExists('constituencies', 'invalid_votes'),
    columnExists('constituencies', 'is_final'),
  ]);

  const migrationStatus = [
    { file: MIGRATION_FILES[0], applied: checks[0], label: '002 — PA schema (4 tables + RLS)' },
    { file: MIGRATION_FILES[1], applied: checks[1], label: '003 — invalid_votes + ec_symbol_id' },
    { file: MIGRATION_FILES[2], applied: checks[2], label: '004 — is_final flag' },
  ];

  for (const m of migrationStatus) {
    console.log(`  ${m.applied ? '✅ applied' : '❌ pending'} : ${m.label}`);
  }

  const pending = migrationStatus.filter((m) => !m.applied);
  if (pending.length === 0) {
    console.log('\n🎉 All 3 migrations are already applied. Nothing to do.');
    return;
  }

  // ── Attempt HTTP execution ──
  console.log(`\nAttempting to apply ${pending.length} migration(s) via HTTP…\n`);

  const failed = [];
  for (const m of pending) {
    const sql = readMigration(m.file);
    const ok = await execSqlHttp(sql, m.label);
    if (!ok) failed.push(m);
  }

  // Re-verify
  if (failed.length > 0) {
    const rechecks = await Promise.all([
      tableExists('pa_constituencies'),
      columnExists('constituencies', 'invalid_votes'),
      columnExists('constituencies', 'is_final'),
    ]);
    migrationStatus[0].applied = rechecks[0];
    migrationStatus[1].applied = rechecks[1];
    migrationStatus[2].applied = rechecks[2];
  }

  const stillPending = migrationStatus.filter((m) => !m.applied);
  if (stillPending.length === 0) {
    console.log('\n🎉 All 3 migrations are now applied!');
    return;
  }

  // ── Fallback: manual instructions ──
  const dashboardUrl = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;
  console.log('\n' + '═'.repeat(64));
  console.log('⚠️  HTTP SQL execution is not available with a service-role key.');
  console.log('   The Supabase REST API (PostgREST) does not support DDL.');
  console.log('');
  console.log('   ➡️  Open the Supabase SQL Editor and paste the SQL below:');
  console.log(`   ${dashboardUrl}`);
  console.log('═'.repeat(64) + '\n');

  for (const m of stillPending) {
    const sql = readMigration(m.file);
    console.log(`-- ════════════════════════════════════════════════════`);
    console.log(`-- Migration: ${m.file}`);
    console.log(`-- ════════════════════════════════════════════════════\n`);
    console.log(sql);
    console.log('');
  }

  console.log('─'.repeat(64));
  console.log('After running the SQL above, re-run this script to verify:');
  console.log('  node scripts/apply-migrations.js');
  console.log('─'.repeat(64));
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
