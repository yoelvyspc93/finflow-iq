import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { CommitmentListCard } from "@/components/commitments/commitment-list-card";
import { BudgetProvisionComposerCard } from "@/components/commitments/budget-provision-composer-card";
import { CommitmentOverviewCard } from "@/components/commitments/commitment-overview-card";
import {
  CommitmentSettlementCard,
  type SubmitCommitmentSettlementValues,
} from "@/components/commitments/commitment-settlement-card";
import { RecurringExpenseComposerCard } from "@/components/commitments/recurring-expense-composer-card";
import { WalletSwitcher } from "@/components/ledger/wallet-switcher";
import { listCategories } from "@/modules/categories/service";
import type { Category } from "@/modules/categories/types";
import {
  createRecurringExpense,
  settleRecurringExpense,
} from "@/modules/commitments/service";
import { selectActiveWallet } from "@/modules/ledger/selectors";
import { createBudgetProvision, settleBudgetProvision } from "@/modules/provisions/service";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useCommitmentStore } from "@/stores/commitment-store";
import { useLedgerStore } from "@/stores/ledger-store";

type CommitmentWorkspaceProps = {
  accentColor: string;
  description: string;
  eyebrow: string;
  hideHero?: boolean;
  title: string;
};

function createCurrentMonthString() {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

function mapCategoryOptions(categories: Category[]) {
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
  }));
}

export function CommitmentWorkspace({
  accentColor,
  description,
  eyebrow,
  hideHero = false,
  title,
}: CommitmentWorkspaceProps) {
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [isSavingRecurring, setIsSavingRecurring] = useState(false);
  const [isSavingProvision, setIsSavingProvision] = useState(false);
  const [isSavingSettlement, setIsSavingSettlement] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const currentMonth = createCurrentMonthString();
  const user = useAuthStore((state) => state.user);
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const setSelectedWalletId = useAppStore((state) => state.setSelectedWalletId);
  const wallets = useAppStore((state) => state.wallets);
  const commitmentError = useCommitmentStore((state) => state.error);
  const isCommitmentLoading = useCommitmentStore((state) => state.isLoading);
  const overview = useCommitmentStore((state) => state.overview);
  const recurringExpenses = useCommitmentStore((state) => state.recurringExpenses);
  const budgetProvisions = useCommitmentStore((state) => state.budgetProvisions);
  const refreshCommitmentData = useCommitmentStore(
    (state) => state.refreshCommitmentData,
  );
  const refreshLedger = useLedgerStore((state) => state.refreshLedger);

  const activeWallet = selectActiveWallet(wallets, selectedWalletId);
  const filteredRecurringExpenses = recurringExpenses.filter(
    (expense) => expense.walletId === selectedWalletId,
  );
  const filteredBudgetProvisions = budgetProvisions.filter(
    (provision) => provision.walletId === selectedWalletId,
  );

  const loadCategories = useCallback(() => {
    if (!user?.id) {
      setCategories([]);
      return () => {};
    }

    const userId = user.id;
    let isMounted = true;

    async function run() {
      try {
        const nextCategories = await listCategories({ userId });

        if (!isMounted) {
          return;
        }

        setCategories(nextCategories);
        setReferenceError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setReferenceError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las categorias.",
        );
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => loadCategories(), [loadCategories]);

  useFocusEffect(
    useCallback(() => loadCategories(), [loadCategories]),
  );

  useEffect(() => {
    if (!user?.id || !selectedWalletId) {
      return;
    }

    void refreshCommitmentData({
      month: currentMonth,
      userId: user.id,
      walletId: selectedWalletId,
    });
  }, [
    currentMonth,
    refreshCommitmentData,
    selectedWalletId,
    user?.id,
  ]);

  async function handleCreateRecurringExpense(values: Parameters<
    typeof createRecurringExpense
  >[0]) {
    if (!user?.id || !selectedWalletId) {
      setRecurringError("Selecciona una billetera válida antes de guardar compromisos.");
      return false;
    }

    setIsSavingRecurring(true);
    setRecurringError(null);

    try {
      await createRecurringExpense(values);
      await refreshCommitmentData({
        month: currentMonth,
        userId: user.id,
        walletId: selectedWalletId,
      });

      return true;
    } catch (error) {
      setRecurringError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el compromiso fijo.",
      );
      return false;
    } finally {
      setIsSavingRecurring(false);
    }
  }

  async function handleCreateBudgetProvision(values: Parameters<
    typeof createBudgetProvision
  >[0]) {
    if (!user?.id || !selectedWalletId) {
      setProvisionError("Selecciona una billetera válida antes de guardar provisiones.");
      return false;
    }

    setIsSavingProvision(true);
    setProvisionError(null);

    try {
      await createBudgetProvision(values);
      await refreshCommitmentData({
        month: currentMonth,
        userId: user.id,
        walletId: selectedWalletId,
      });

      return true;
    } catch (error) {
      setProvisionError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la provision.",
      );
      return false;
    } finally {
      setIsSavingProvision(false);
    }
  }

  async function handleSettleCommitment(
    values: SubmitCommitmentSettlementValues,
  ) {
    if (!user?.id || !selectedWalletId) {
      setSettlementError("Selecciona una billetera válida antes de registrar pagos.");
      return false;
    }

    setIsSavingSettlement(true);
    setSettlementError(null);

    try {
      if (values.kind === "recurring") {
        await settleRecurringExpense({
          amount: values.amount,
          date: values.date,
          description: values.description,
          recurringExpenseId: values.commitmentId,
        });
      } else {
        await settleBudgetProvision({
          amount: values.amount,
          budgetProvisionId: values.commitmentId,
          date: values.date,
          description: values.description,
        });
      }

      await Promise.all([
        refreshAppData({
          userId: user.id,
        }),
        refreshLedger({
          userId: user.id,
          walletId: selectedWalletId,
        }),
        refreshCommitmentData({
          month: currentMonth,
          userId: user.id,
          walletId: selectedWalletId,
        }),
      ]);

      return true;
    } catch (error) {
      setSettlementError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el pago real.",
      );
      return false;
    } finally {
      setIsSavingSettlement(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {!hideHero ? (
        <View style={[styles.heroCard, { borderColor: accentColor }]}>
          <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      ) : null}

      <WalletSwitcher
        onSelect={setSelectedWalletId}
        selectedWalletId={selectedWalletId}
        wallets={wallets}
      />

      <CommitmentOverviewCard
        activeWallet={activeWallet}
        isLoading={isCommitmentLoading}
        overview={overview}
      />

      <RecurringExpenseComposerCard
        categories={mapCategoryOptions(categories)}
        isSubmitting={isSavingRecurring}
        onSubmit={handleCreateRecurringExpense}
        submitError={recurringError}
        walletId={selectedWalletId}
      />

      <BudgetProvisionComposerCard
        categories={mapCategoryOptions(categories)}
        isSubmitting={isSavingProvision}
        onSubmit={handleCreateBudgetProvision}
        submitError={provisionError}
        walletId={selectedWalletId}
      />

      <CommitmentSettlementCard
        budgetProvisions={filteredBudgetProvisions}
        isSubmitting={isSavingSettlement}
        onSubmit={handleSettleCommitment}
        recurringExpenses={filteredRecurringExpenses}
        submitError={settlementError}
      />

      <CommitmentListCard activeWallet={activeWallet} overview={overview} />

      {referenceError ? <Text style={styles.errorText}>{referenceError}</Text> : null}
      {commitmentError ? <Text style={styles.errorText}>{commitmentError}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 24,
  },
  heroCard: {
    borderRadius: 30,
    borderWidth: 1,
    backgroundColor: "#121B31",
    gap: 12,
    padding: 22,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "800",
  },
  description: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
});
