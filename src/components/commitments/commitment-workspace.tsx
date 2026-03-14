import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

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
import { createLocalRecurringExpense } from "@/modules/commitments/types";
import { selectActiveWallet } from "@/modules/ledger/selectors";
import { createLocalLedgerEntry } from "@/modules/ledger/types";
import { createBudgetProvision, settleBudgetProvision } from "@/modules/provisions/service";
import { createLocalBudgetProvision } from "@/modules/provisions/types";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useCommitmentStore } from "@/stores/commitment-store";
import { useLedgerStore } from "@/stores/ledger-store";

type CommitmentWorkspaceProps = {
  accentColor: string;
  description: string;
  eyebrow: string;
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
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const applyWalletBalanceDelta = useAppStore(
    (state) => state.applyWalletBalanceDelta,
  );
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const setSelectedWalletId = useAppStore((state) => state.setSelectedWalletId);
  const wallets = useAppStore((state) => state.wallets);
  const addLocalBudgetProvision = useCommitmentStore(
    (state) => state.addLocalBudgetProvision,
  );
  const addLocalPaymentEntry = useCommitmentStore(
    (state) => state.addLocalPaymentEntry,
  );
  const addLocalRecurringExpense = useCommitmentStore(
    (state) => state.addLocalRecurringExpense,
  );
  const commitmentError = useCommitmentStore((state) => state.error);
  const isCommitmentLoading = useCommitmentStore((state) => state.isLoading);
  const overview = useCommitmentStore((state) => state.overview);
  const recalculateOverview = useCommitmentStore(
    (state) => state.recalculateOverview,
  );
  const recurringExpenses = useCommitmentStore((state) => state.recurringExpenses);
  const budgetProvisions = useCommitmentStore((state) => state.budgetProvisions);
  const refreshCommitmentData = useCommitmentStore(
    (state) => state.refreshCommitmentData,
  );
  const addLocalEntry = useLedgerStore((state) => state.addLocalEntry);
  const refreshLedger = useLedgerStore((state) => state.refreshLedger);

  const activeWallet = selectActiveWallet(wallets, selectedWalletId);
  const filteredRecurringExpenses = recurringExpenses.filter(
    (expense) => expense.walletId === selectedWalletId,
  );
  const filteredBudgetProvisions = budgetProvisions.filter(
    (provision) => provision.walletId === selectedWalletId,
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const userId = user.id;
    let isMounted = true;

    async function loadCategories() {
      try {
        const nextCategories = await listCategories({ isDevBypass, userId });

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

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, [isDevBypass, user?.id]);

  useEffect(() => {
    if (!user?.id || !selectedWalletId) {
      return;
    }

    void refreshCommitmentData({
      isDevBypass,
      month: currentMonth,
      userId: user.id,
      walletId: selectedWalletId,
    });
  }, [
    currentMonth,
    isDevBypass,
    refreshCommitmentData,
    selectedWalletId,
    user?.id,
  ]);

  async function handleCreateRecurringExpense(values: Parameters<
    typeof createRecurringExpense
  >[0]) {
    if (!user?.id || !selectedWalletId) {
      setRecurringError("Selecciona una wallet valida antes de guardar compromisos.");
      return false;
    }

    setIsSavingRecurring(true);
    setRecurringError(null);

    try {
      if (isDevBypass) {
        addLocalRecurringExpense(
          createLocalRecurringExpense({
            ...values,
            userId: user.id,
          }),
        );
        recalculateOverview({
          month: currentMonth,
          walletId: selectedWalletId,
        });
      } else {
        await createRecurringExpense(values);
        await refreshCommitmentData({
          isDevBypass: false,
          month: currentMonth,
          userId: user.id,
          walletId: selectedWalletId,
        });
      }

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
      setProvisionError("Selecciona una wallet valida antes de guardar provisiones.");
      return false;
    }

    setIsSavingProvision(true);
    setProvisionError(null);

    try {
      if (isDevBypass) {
        addLocalBudgetProvision(
          createLocalBudgetProvision({
            ...values,
            userId: user.id,
          }),
        );
        recalculateOverview({
          month: currentMonth,
          walletId: selectedWalletId,
        });
      } else {
        await createBudgetProvision(values);
        await refreshCommitmentData({
          isDevBypass: false,
          month: currentMonth,
          userId: user.id,
          walletId: selectedWalletId,
        });
      }

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
      setSettlementError("Selecciona una wallet valida antes de registrar pagos.");
      return false;
    }

    setIsSavingSettlement(true);
    setSettlementError(null);

    try {
      if (isDevBypass) {
        const recurringExpense = filteredRecurringExpenses.find(
          (expense) => expense.id === values.commitmentId,
        );
        const provision = filteredBudgetProvisions.find(
          (item) => item.id === values.commitmentId,
        );

        const entry = createLocalLedgerEntry({
          amount: values.amount * -1,
          budgetProvisionId:
            values.kind === "provision" ? values.commitmentId : null,
          categoryId:
            values.kind === "recurring"
              ? (recurringExpense?.categoryId ?? null)
              : (provision?.categoryId ?? null),
          date: values.date,
          description: values.description,
          recurringExpenseId:
            values.kind === "recurring" ? values.commitmentId : null,
          type:
            values.kind === "recurring"
              ? "recurring_expense_payment"
              : "budget_provision_payment",
          userId: user.id,
          walletId: selectedWalletId,
        });

        addLocalEntry(entry);
        addLocalPaymentEntry(entry, {
          month: currentMonth,
          walletId: selectedWalletId,
        });
        applyWalletBalanceDelta({
          amount: values.amount * -1,
          walletId: selectedWalletId,
        });
      } else {
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
            isDevBypass: false,
            userId: user.id,
          }),
          refreshLedger({
            isDevBypass: false,
            userId: user.id,
            walletId: selectedWalletId,
          }),
          refreshCommitmentData({
            isDevBypass: false,
            month: currentMonth,
            userId: user.id,
            walletId: selectedWalletId,
          }),
        ]);
      }

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
      <View style={[styles.heroCard, { borderColor: accentColor }]}>
        <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

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
