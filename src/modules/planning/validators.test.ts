import { describe, expect, it } from 'vitest'

import type { PlanningCommitmentDraft } from '@/components/planning/commitment-sheet'
import type {
  ContributionDraft,
  GoalDraft,
  WishDraft,
} from '@/components/planning/planning-sheet-stack'
import {
  validateCommitmentEventMonth,
  validateCommitmentFixedDay,
  validateCommitmentSubmit,
  validateContributionSubmit,
  validateGoalSubmit,
  validateWishSubmit,
} from '@/modules/planning/validators'

const goalDraft: GoalDraft = {
  deadline: '',
  name: 'Emergency Fund',
  targetAmount: '1200',
  walletId: 'wallet-1',
}

const contributionDraft: ContributionDraft = {
  amount: '150',
  date: '2026-03-18',
  goalId: 'goal-1',
  note: '',
}

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
  it('covers goal and contribution error paths', () => {
    expect(validateGoalSubmit({ draft: goalDraft, userId: undefined })).toBe(
      'No hay sesion activa.',
    )
    expect(
      validateGoalSubmit({
        draft: { ...goalDraft, name: '' },
        userId: 'user-1',
      }),
    ).toBe('Escribe un nombre para la meta.')
    expect(
      validateContributionSubmit({
        draft: { ...contributionDraft, amount: '0' },
        hasSelectedGoal: true,
        userId: 'user-1',
      }),
    ).toBe('Selecciona una meta valida y un monto mayor que cero.')
  })

  it('covers wish validation and priority-related input errors', () => {
    expect(validateWishSubmit({ draft: wishDraft, userId: undefined })).toBe(
      'No hay sesion activa.',
    )
    expect(
      validateWishSubmit({
        draft: { ...wishDraft, priority: '0' },
        userId: 'user-1',
      }),
    ).toBe('Completa nombre, monto, prioridad y wallet.')
  })

  it('covers commitment validation and fixed/event date errors', () => {
    expect(
      validateCommitmentSubmit({ draft: commitmentDraft, userId: undefined }),
    ).toBe('No hay sesion activa.')
    expect(
      validateCommitmentSubmit({
        draft: { ...commitmentDraft, amount: '0' },
        userId: 'user-1',
      }),
    ).toBe('Completa nombre, monto y wallet.')
    expect(validateCommitmentFixedDay('0')).toBe(
      'El dia de cobro debe ser entre 1 y 31.',
    )
    expect(validateCommitmentFixedDay('08')).toBeNull()
    expect(validateCommitmentEventMonth('2026/03')).toBe(
      'El mes debe tener formato YYYY-MM.',
    )
    expect(validateCommitmentEventMonth('2026-03')).toBeNull()
  })
})
