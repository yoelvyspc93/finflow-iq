import type { Goal, GoalContribution, GoalStatus } from "@/modules/goals/types";

export type GoalSnapshotStatus = GoalStatus | "at_risk";

export type GoalProgressSnapshot = {
  contributedAmount: number;
  goal: Goal;
  isOverdue: boolean;
  projectedCompletionDate: string | null;
  progressRatio: number;
  remainingAmount: number;
  status: GoalSnapshotStatus;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function addMonths(date: string, months: number) {
  const reference = new Date(`${date}T00:00:00.000Z`);
  reference.setUTCMonth(reference.getUTCMonth() + months);
  return reference.toISOString().slice(0, 10);
}

function calculateAverageMonthlyContribution(
  contributions: GoalContribution[],
  goalId: string,
) {
  const goalContributions = contributions.filter(
    (contribution) => contribution.goalId === goalId,
  );

  if (goalContributions.length === 0) {
    return 0;
  }

  const ordered = [...goalContributions].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const firstDate = new Date(`${ordered[0].date}T00:00:00.000Z`);
  const lastDate = new Date(
    `${ordered[ordered.length - 1].date}T00:00:00.000Z`,
  );
  const monthSpan = Math.max(
    1,
    (lastDate.getUTCFullYear() - firstDate.getUTCFullYear()) * 12 +
      (lastDate.getUTCMonth() - firstDate.getUTCMonth()) +
      1,
  );

  return (
    goalContributions.reduce(
      (total, contribution) => total + contribution.amount,
      0,
    ) / monthSpan
  );
}

export function calculateGoalSnapshots(args: {
  contributions: GoalContribution[];
  goals: Goal[];
  referenceDate?: string;
}): GoalProgressSnapshot[] {
  const referenceDate =
    args.referenceDate ?? new Date().toISOString().slice(0, 10);

  return [...args.goals]
    .map<GoalProgressSnapshot>((goal) => {
      const contributedAmount = args.contributions
        .filter((contribution) => contribution.goalId === goal.id)
        .reduce((total, contribution) => total + contribution.amount, 0);
      const remainingAmount = Math.max(goal.targetAmount - contributedAmount, 0);
      const progressRatio =
        goal.targetAmount > 0
          ? clamp(contributedAmount / goal.targetAmount, 0, 1)
          : 0;
      const averageMonthlyContribution = calculateAverageMonthlyContribution(
        args.contributions,
        goal.id,
      );
      const projectedCompletionDate =
        averageMonthlyContribution > 0 && remainingAmount > 0
          ? addMonths(
              referenceDate,
              Math.ceil(remainingAmount / averageMonthlyContribution),
            )
          : remainingAmount === 0
            ? referenceDate
            : null;
      const isOverdue =
        Boolean(goal.deadline) &&
        remainingAmount > 0 &&
        goal.deadline! < referenceDate;

      let status: GoalSnapshotStatus = goal.status;

      if (goal.status === "active" && remainingAmount === 0) {
        status = "completed";
      } else if (goal.status === "active" && isOverdue) {
        status = "at_risk";
      }

      return {
        contributedAmount,
        goal,
        isOverdue,
        projectedCompletionDate,
        progressRatio,
        remainingAmount,
        status,
      };
    })
    .sort((left, right) => {
      const leftKey = `${left.goal.deadline ?? "9999-12-31"}-${left.goal.createdAt}`;
      const rightKey = `${right.goal.deadline ?? "9999-12-31"}-${right.goal.createdAt}`;
      return leftKey.localeCompare(rightKey);
    });
}

export function calculateAverageGoalContributionPerMonth(
  contributions: GoalContribution[],
) {
  if (contributions.length === 0) {
    return 0;
  }

  const ordered = [...contributions].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const firstDate = new Date(`${ordered[0].date}T00:00:00.000Z`);
  const lastDate = new Date(
    `${ordered[ordered.length - 1].date}T00:00:00.000Z`,
  );
  const monthSpan = Math.max(
    1,
    (lastDate.getUTCFullYear() - firstDate.getUTCFullYear()) * 12 +
      (lastDate.getUTCMonth() - firstDate.getUTCMonth()) +
      1,
  );

  return (
    contributions.reduce((total, contribution) => total + contribution.amount, 0) /
    monthSpan
  );
}
