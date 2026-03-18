import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationDir = join(process.cwd(), 'supabase', 'migrations')
const targetFiles = [
  '0002_ledger.sql',
  '0003_salary.sql',
  '0004_exchanges.sql',
  '0005_commitments.sql',
  '0006_planning.sql',
  '0007_profiles_auth_mfa.sql',
]

describe('supabase security definer migrations', () => {
  it('pins search_path to public for each audited migration block', () => {
    for (const file of targetFiles) {
      const sql = readFileSync(join(migrationDir, file), 'utf8').toLowerCase()
      if (!sql.includes('security definer')) {
        continue
      }

      expect(sql).toContain('set search_path = public')
    }
  })

  it('keeps execute grants for authenticated callers on audited rpc migrations', () => {
    const rpcFiles = [
      '0002_ledger.sql',
      '0003_salary.sql',
      '0004_exchanges.sql',
      '0005_commitments.sql',
      '0006_planning.sql',
    ]

    for (const file of rpcFiles) {
      const sql = readFileSync(join(migrationDir, file), 'utf8').toLowerCase()
      expect(sql).toContain('grant execute on function')
      expect(sql).toContain('to authenticated')
    }
  })
})
