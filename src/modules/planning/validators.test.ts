import { describe, expect, it } from 'vitest'

import type { PlanningCommitmentDraft } from '@/components/planning/commitment-sheet'
import type { WishDraft } from '@/components/planning/planning-sheet-stack'
import {
  validateCommitmentEventMonth,
  validateCommitmentFixedDay,
  validateCommitmentSubmit,
  validateWishSubmit,
} from '@/modules/planning/validators'

const wishDraft: WishDraft = {
  amount: '300',
  name: 'Headphones',
  notes: '',
  priority: '1',
  walletId: 'wallet-1',
}

const commitmentDraft: PlanningCommitmentDraft = {
  amount: '120',
  day: '08',
  kind: 'fixed',
  month: '2026-03',
  name: 'Rent',
  notes: '',
  walletId: 'wallet-1',
}

describe('planning validators', () => {
  it('covers wish validation and priority-related input errors', () => {
    expect(validateWishSubmit({ draft: wishDraft, userId: undefined })).toBe(
      'No hay una sesión activa.',
    )
    expect(
      validateWishSubmit({
        draft: { ...wishDraft, priority: '0' },
        userId: 'user-1',
      }),
    ).toBe('Completa el nombre, el monto, la prioridad y la billetera.')
  })

  it('covers commitment validation and fixed/event date errors', () => {
    expect(
      validateCommitmentSubmit({ draft: commitmentDraft, userId: undefined }),
    ).toBe('No hay una sesión activa.')
    expect(
      validateCommitmentSubmit({
        draft: { ...commitmentDraft, amount: '0' },
        userId: 'user-1',
      }),
    ).toBe('Completa el nombre, el monto y la billetera.')
    expect(validateCommitmentFixedDay('0')).toBe(
      'El día de pago debe estar entre 1 y 31.',
    )
    expect(validateCommitmentFixedDay('08')).toBeNull()
    expect(validateCommitmentEventMonth('2026/03')).toBe(
      'El mes debe tener el formato AAAA-MM.',
    )
    expect(validateCommitmentEventMonth('2026-03')).toBeNull()
  })
})
