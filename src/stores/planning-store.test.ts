import { beforeEach, describe, expect, it, vi } from 'vitest'

const refreshMock = vi.fn()

vi.mock('@/modules/planning/planning-refresh-service', () => ({
  planningRefreshService: {
    refresh: refreshMock,
  },
}))

const { usePlanningStore } = await import('@/stores/planning-store')

describe('usePlanningStore', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    usePlanningStore.getState().reset()
  })

  it('delegates refresh to the planning refresh service and only applies state', async () => {
    refreshMock.mockResolvedValue({
      currentScore: null,
      overview: { assignableAmount: 10 },
      recentScores: [],
      wishProjections: [{ id: 'wp-1' }],
      wishes: [{ id: 'w-1' }],
    })

    await usePlanningStore.getState().refreshPlanningData({
      settings: null,
      userId: 'user-1',
      wallets: [],
    })

    const state = usePlanningStore.getState()
    expect(refreshMock).toHaveBeenCalledOnce()
    expect(state.wishes).toEqual([{ id: 'w-1' }])
    expect(state.error).toBeNull()
    expect(state.isReady).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('cleans derived state when the refresh service fails', async () => {
    refreshMock.mockRejectedValue(new Error('refresh failed'))

    await usePlanningStore.getState().refreshPlanningData({
      settings: null,
      userId: 'user-1',
      wallets: [],
    })

    const state = usePlanningStore.getState()
    expect(state.error).toBe('refresh failed')
    expect(state.wishProjections).toEqual([])
    expect(state.wishes).toEqual([])
    expect(state.isReady).toBe(true)
    expect(state.isLoading).toBe(false)
  })
})
