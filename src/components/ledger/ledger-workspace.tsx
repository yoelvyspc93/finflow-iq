import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FinancialCards } from "@/components/dashboard/financial-cards";
import { ExchangeComposerCard } from "@/components/exchanges/exchange-composer-card";
import { ExchangeListCard } from "@/components/exchanges/exchange-list-card";
import { listCategories } from "@/modules/categories/service";
import type { Category } from "@/modules/categories/types";
import { transferBetweenWallets } from "@/modules/exchanges/service";
import { createLocalCurrencyExchange } from "@/modules/exchanges/types";
import { listIncomeSources } from "@/modules/income-sources/service";
import type { IncomeSource } from "@/modules/income-sources/types";
import {
  createExpense,
  createManualIncome,
} from "@/modules/ledger/service";
import { createLocalLedgerEntry } from "@/modules/ledger/types";
import { selectActiveWallet, selectRecentLedgerEntries } from "@/modules/ledger/selectors";
import { createMockSalaryPeriods, createMockSalaryPayments } from "@/modules/salary/types";
import {
  MovementComposerCard,
  type MovementMode,
  type SubmitMovementValues,
} from "@/components/ledger/movement-composer-card";
import { MovementHistoryCard } from "@/components/ledger/movement-history-card";
import { WalletSwitcher } from "@/components/ledger/wallet-switcher";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useCommitmentStore } from "@/stores/commitment-store";
import { useExchangeStore } from "@/stores/exchange-store";
import { useLedgerStore } from "@/stores/ledger-store";
import { useSalaryStore } from "@/stores/salary-store";
import { calculateSalaryOverview } from "@/modules/salary/calculations";

type LedgerWorkspaceProps = {
  accentColor: string;
  description: string;
  eyebrow: string;
  showExchangeTools?: boolean;
  showFinancialCards?: boolean;
  title: string;
};

function mapCategoryOptions(categories: Category[]) {
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
  }));
}

function mapIncomeSourceOptions(incomeSources: IncomeSource[]) {
  return incomeSources.map((incomeSource) => ({
    id: incomeSource.id,
    label: incomeSource.name,
  }));
}

export function LedgerWorkspace({
  accentColor,
  description,
  eyebrow,
  showExchangeTools = false,
  showFinancialCards = false,
  title,
}: LedgerWorkspaceProps) {
  const [mode, setMode] = useState<MovementMode>("income");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const applyWalletBalanceDelta = useAppStore(
    (state) => state.applyWalletBalanceDelta,
  );
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const setSelectedWalletId = useAppStore((state) => state.setSelectedWalletId);
  const settings = useAppStore((state) => state.settings);
  const wallets = useAppStore((state) => state.wallets);
  const commitmentOverview = useCommitmentStore((state) => state.overview);
  const commitmentLoading = useCommitmentStore((state) => state.isLoading);
  const refreshCommitmentData = useCommitmentStore(
    (state) => state.refreshCommitmentData,
  );
  const exchanges = useExchangeStore((state) => state.exchanges);
  const exchangeLoading = useExchangeStore((state) => state.isLoading);
  const refreshExchangeData = useExchangeStore((state) => state.refreshExchangeData);
  const addLocalExchange = useExchangeStore((state) => state.addLocalExchange);
  const addLocalEntry = useLedgerStore((state) => state.addLocalEntry);
  const entries = useLedgerStore((state) => state.entries);
  const isLedgerLoading = useLedgerStore((state) => state.isLoading);
  const ledgerError = useLedgerStore((state) => state.error);
  const refreshLedger = useLedgerStore((state) => state.refreshLedger);
  const refreshSalaryData = useSalaryStore((state) => state.refreshSalaryData);
  const salaryOverview = useSalaryStore((state) => state.overview);

  const activeWallet = selectActiveWallet(wallets, selectedWalletId);
  const recentEntries = selectRecentLedgerEntries(entries, 8);
  const visibleExchanges = useMemo(
    () =>
      exchanges.filter(
        (exchange) =>
          exchange.fromWalletId === selectedWalletId ||
          exchange.toWalletId === selectedWalletId,
      ),
    [exchanges, selectedWalletId],
  );
  const effectiveSalaryOverview = useMemo(() => {
    if (salaryOverview) {
      return salaryOverview;
    }

    if (!isDevBypass || !user?.id) {
      return null;
    }

    return calculateSalaryOverview(
      createMockSalaryPeriods(user.id),
      createMockSalaryPayments(user.id),
    );
  }, [isDevBypass, salaryOverview, user?.id]);
  const committedAmount = commitmentOverview?.totalRemaining ?? 0;
  const freeAmount = (activeWallet?.balance ?? 0) - committedAmount;
  const reserveAmount =
    (commitmentOverview?.recurringCommitted ?? 0) *
    (effectiveSalaryOverview?.monthsWithoutPayment ?? 0) *
    (1 + (settings?.savingsGoalPercent ?? 0) / 100);
  const assignableAmount = freeAmount - reserveAmount;

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const userId = user.id;
    let isMounted = true;

    async function loadReferenceData() {
      try {
        const [nextCategories, nextIncomeSources] = await Promise.all([
          listCategories({ isDevBypass, userId }),
          listIncomeSources({ isDevBypass, userId }),
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(nextCategories);
        setIncomeSources(nextIncomeSources);
        setReferenceError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setReferenceError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar categorias y fuentes.",
        );
      }
    }

    void loadReferenceData();

    return () => {
      isMounted = false;
    };
  }, [isDevBypass, user?.id]);

  useEffect(() => {
    if (!user?.id || !selectedWalletId) {
      return;
    }

    if (showExchangeTools) {
      void refreshExchangeData({
        isDevBypass,
        userId: user.id,
      });
    }

    if (showFinancialCards) {
      void Promise.all([
        refreshCommitmentData({
          isDevBypass,
          month: currentMonth,
          userId: user.id,
          walletId: selectedWalletId,
        }),
        refreshSalaryData({
          isDevBypass,
          userId: user.id,
        }),
      ]);
    }
  }, [
    currentMonth,
    isDevBypass,
    refreshCommitmentData,
    refreshExchangeData,
    refreshSalaryData,
    selectedWalletId,
    showExchangeTools,
    showFinancialCards,
    user?.id,
  ]);

  async function handleSubmit(values: SubmitMovementValues) {
    if (!user?.id || !selectedWalletId) {
      setSubmitError("Selecciona una wallet valida antes de registrar movimientos.");
      return false;
    }

    const userId = user.id;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isDevBypass) {
        const signedAmount = mode === "income" ? values.amount : values.amount * -1;

        addLocalEntry(
          createLocalLedgerEntry({
            amount: signedAmount,
            categoryId: mode === "expense" ? values.referenceId : null,
            date: values.date,
            description: values.description,
            incomeSourceId: mode === "income" ? values.referenceId : null,
            type: mode,
            userId,
            walletId: selectedWalletId,
          }),
        );
        applyWalletBalanceDelta({
          amount: signedAmount,
          walletId: selectedWalletId,
        });
      } else {
        if (mode === "income") {
          await createManualIncome({
            amount: values.amount,
            date: values.date,
            description: values.description,
            incomeSourceId: values.referenceId,
            walletId: selectedWalletId,
          });
        } else {
          await createExpense({
            amount: values.amount,
            categoryId: values.referenceId,
            date: values.date,
            description: values.description,
            walletId: selectedWalletId,
          });
        }

        await Promise.all([
          refreshAppData({ isDevBypass: false, userId }),
          refreshLedger({
            isDevBypass: false,
            userId,
            walletId: selectedWalletId,
          }),
        ]);
      }

      return true;
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el movimiento.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTransfer(values: {
    date: string;
    description: string | null;
    destinationAmount: number;
    destinationWalletId: string;
    exchangeRate: number;
    sourceAmount: number;
  }) {
    if (!user?.id || !selectedWalletId) {
      setExchangeError("Selecciona una wallet valida antes de transferir.");
      return false;
    }

    setIsSubmittingExchange(true);
    setExchangeError(null);

    try {
      if (isDevBypass) {
        const exchange = createLocalCurrencyExchange({
          description: values.description,
          destinationAmount: values.destinationAmount,
          destinationWalletId: values.destinationWalletId,
          exchangeInEntryId: `local-ledger-in-${Date.now()}`,
          exchangeOutEntryId: `local-ledger-out-${Date.now()}`,
          exchangeRate: values.exchangeRate,
          sourceAmount: values.sourceAmount,
          sourceWalletId: selectedWalletId,
          transferDate: values.date,
          userId: user.id,
        });

        addLocalExchange(exchange);
        addLocalEntry(
          createLocalLedgerEntry({
            amount: values.sourceAmount * -1,
            date: values.date,
            description: values.description,
            type: "exchange_out",
            userId: user.id,
            walletId: selectedWalletId,
          }),
        );
        addLocalEntry(
          createLocalLedgerEntry({
            amount: values.destinationAmount,
            date: values.date,
            description: values.description,
            type: "exchange_in",
            userId: user.id,
            walletId: values.destinationWalletId,
          }),
        );
        applyWalletBalanceDelta({
          amount: values.sourceAmount * -1,
          walletId: selectedWalletId,
        });
        applyWalletBalanceDelta({
          amount: values.destinationAmount,
          walletId: values.destinationWalletId,
        });
        await refreshLedger({
          isDevBypass: true,
          userId: user.id,
          walletId: selectedWalletId,
        });
      } else {
        await transferBetweenWallets({
          description: values.description,
          destinationAmount: values.destinationAmount,
          destinationWalletId: values.destinationWalletId,
          exchangeRate: values.exchangeRate,
          sourceAmount: values.sourceAmount,
          sourceWalletId: selectedWalletId,
          transferDate: values.date,
        });

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
          refreshExchangeData({
            isDevBypass: false,
            userId: user.id,
          }),
        ]);
      }

      return true;
    } catch (error) {
      setExchangeError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la transferencia.",
      );
      return false;
    } finally {
      setIsSubmittingExchange(false);
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

        <View style={styles.balanceRow}>
          <View style={styles.balancePanel}>
            <Text style={styles.panelLabel}>Disponible</Text>
            <Text style={styles.balanceValue}>
              {activeWallet
                ? `${activeWallet.currency} ${activeWallet.balance.toFixed(2)}`
                : "--"}
            </Text>
            <Text style={styles.panelMeta}>
              Wallet: {activeWallet?.name ?? "sin seleccionar"}
            </Text>
          </View>

          <View style={styles.balancePanel}>
            <Text style={styles.panelLabel}>Configuracion</Text>
            <Text style={styles.smallValue}>
              Ahorro {settings?.savingsGoalPercent ?? "--"}%
            </Text>
            <Text style={styles.panelMeta}>
              Fecha: {settings?.dateFormat ?? "--"}
            </Text>
          </View>
        </View>
      </View>

      {showFinancialCards ? (
        <FinancialCards
          assignableAmount={assignableAmount}
          committedAmount={committedAmount}
          currency={activeWallet?.currency ?? null}
          freeAmount={freeAmount}
          isLoading={commitmentLoading}
          reserveAmount={reserveAmount}
        />
      ) : null}

      <WalletSwitcher
        onSelect={setSelectedWalletId}
        selectedWalletId={selectedWalletId}
        wallets={wallets}
      />

      <MovementComposerCard
        expenseOptions={mapCategoryOptions(categories)}
        incomeOptions={mapIncomeSourceOptions(incomeSources)}
        isSubmitting={isSubmitting}
        mode={mode}
        onModeChange={setMode}
        onSubmit={handleSubmit}
        submitError={submitError}
      />

      {referenceError ? <Text style={styles.errorText}>{referenceError}</Text> : null}
      {ledgerError ? <Text style={styles.errorText}>{ledgerError}</Text> : null}

      {showExchangeTools ? (
        <>
          <ExchangeComposerCard
            activeWallet={activeWallet}
            isSubmitting={isSubmittingExchange}
            onSubmit={handleTransfer}
            submitError={exchangeError}
            wallets={wallets}
          />
          <ExchangeListCard
            exchanges={visibleExchanges}
            isLoading={exchangeLoading}
            wallets={wallets}
          />
        </>
      ) : null}

      <MovementHistoryCard entries={recentEntries} isLoading={isLedgerLoading} />
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
  balanceRow: {
    flexDirection: "row",
    gap: 12,
  },
  balancePanel: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#0C1324",
    gap: 6,
    padding: 16,
  },
  panelLabel: {
    color: "#8DA1C4",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  balanceValue: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "900",
  },
  smallValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  panelMeta: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
});
