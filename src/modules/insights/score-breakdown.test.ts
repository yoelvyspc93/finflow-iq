import { parseFinancialScoreBreakdown } from "@/modules/insights/score-breakdown";

describe("parseFinancialScoreBreakdown", () => {
  it("parses valid breakdown objects without casts", () => {
    expect(
      parseFinancialScoreBreakdown(
        {
          commitment_score: 10,
          liquidity_score: 20,
          salary_stability_score: 30,
          savings_score: 40,
          total_score: 50,
          wishlist_pressure_score: 60,
        },
        99,
      ),
    ).toEqual({
      commitment_score: 10,
      liquidity_score: 20,
      salary_stability_score: 30,
      savings_score: 40,
      total_score: 50,
      wishlist_pressure_score: 60,
    });
  });

  it("falls back safely when the payload is malformed", () => {
    expect(parseFinancialScoreBreakdown("invalid", 77)).toEqual({
      commitment_score: 0,
      liquidity_score: 0,
      salary_stability_score: 0,
      savings_score: 0,
      total_score: 77,
      wishlist_pressure_score: 0,
    });
  });
});
