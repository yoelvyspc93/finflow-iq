import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { WalletSwitcher } from "@/components/ledger/wallet-switcher";
import { SalaryOverviewCard } from "@/components/salary/salary-overview-card";
import { SalaryPaymentComposerCard } from "@/components/salary/salary-payment-composer-card";
import { SalaryPaymentListCard } from "@/components/salary/salary-payment-list-card";
import { SalaryPeriodComposerCard } from "@/components/salary/salary-period-composer-card";
import { SalaryPeriodListCard } from "@/components/salary/salary-period-list-card";
import { createLocalLedgerEntry } from "@/modules/ledger/types";
import { selectActiveWallet } from "@/modules/ledger/selectors";
import { calculateSalaryOverview } from "@/modules/salary/calculations";
import {
  createSalaryPeriod,
  registerSalaryPayment,
} from "@/modules/salary/service";
import {
  createLocalSalaryAllocation,
  createLocalSalaryPayment,
  createLocalSalaryPeriod,
  type SalaryAllocationInput,
  type SalaryCurrency,
} from "@/modules/salary/types";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useLedgerStore } from "@/stores/ledger-store";
import { useSalaryStore } from "@/stores/salary-store";

function isSalaryCurrency(value: string): value is SalaryCurrency {
  return value === "USD" || value === "CUP";
}

type SalaryWorkspaceProps = {
  accentColor: string;
  description: string;
  eyebrow: string;
  title: string;
};

export function SalaryWorkspace({
  accentColor,
  description,
  eyebrow,
  title,
}: SalaryWorkspaceProps) {
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const applyWalletBalanceDelta = useAppStore(
    (state) => state.applyWalletBalanceDelta,
  );
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const setSelectedWalletId = useAppStore((state) => state.setSelectedWalletId);
  const wallets = useAppStore((state) => state.wallets);
  const addLocalEntry = useLedgerStore((state) => state.addLocalEntry);
  const refreshLedger = useLedgerStore((state) => state.refreshLedger);
  const addLocalSalaryPeriod = useSalaryStore((state) => state.addLocalSalaryPeriod);
  const allocations = useSalaryStore((state) => state.allocations);
  const applyLocalSalaryPayment = useSalaryStore(
    (state) => state.applyLocalSalaryPayment,
  );
  const error = useSalaryStore((state) => state.error);
  const isLoading = useSalaryStore((state) => state.isLoading);
  const payments = useSalaryStore((state) => state.payments);
  const periods = useSalaryStore((state) => state.periods);
  const refreshSalaryData = useSalaryStore((state) => state.refreshSalaryData);

  const activeWallet = selectActiveWallet(wallets, selectedWalletId);
  const activeCurrency = activeWallet?.currency ?? "";
  const salaryCurrency = isSalaryCurrency(activeCurrency) ? activeCurrency : null;

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void refreshSalaryData({
      isDevBypass,
      userId: user.id,
    });
  }, [isDevBypass, refreshSalaryData, user?.id]);

  const filteredPeriods = useMemo(() => {
    if (!salaryCurrency) {
      return [];
    }

    return periods.filter((period) => period.currency === salaryCurrency);
  }, [periods, salaryCurrency]);

  const filteredPayments = useMemo(() => {
    if (!selectedWalletId) {
      return [];
    }

    return payments.filter((payment) => payment.walletId === selectedWalletId);
  }, [payments, selectedWalletId]);

  const filteredOverview = useMemo(
    () => calculateSalaryOverview(filteredPeriods, filteredPayments),
    [filteredPayments, filteredPeriods],
  );

  async function handleCreatePeriod(values: {
    expectedAmount: number;
    notes: string | null;
    periodMonth: string;
  }) {
    if (!user?.id || !salaryCurrency) {
      setPeriodError("Selecciona una wallet salarial valida antes de crear periodos.");
      return false;
    }

    setIsCreatingPeriod(true);
    setPeriodError(null);

    try {
      if (isDevBypass) {
        addLocalSalaryPeriod(
          createLocalSalaryPeriod({
            currency: salaryCurrency,
            expectedAmount: values.expectedAmount,
            notes: values.notes,
            periodMonth: values.periodMonth,
            userId: user.id,
          }),
        );
      } else {
        await createSalaryPeriod({
          currency: salaryCurrency,
          expectedAmount: values.expectedAmount,
          notes: values.notes,
          periodMonth: values.periodMonth,
        });

        await refreshSalaryData({
          isDevBypass: false,
          userId: user.id,
        });
      }

      return true;
    } catch (caughtError) {
      setPeriodError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo guardar el periodo salarial.",
      );
      return false;
    } finally {
      setIsCreatingPeriod(false);
    }
  }

  async function handleRegisterPayment(values: {
    allocations: SalaryAllocationInput[];
    amount: number;
    description: string | null;
    paymentDate: string;
  }) {
    if (!user?.id || !selectedWalletId || !salaryCurrency) {
      setPaymentError("Selecciona una wallet salarial valida antes de registrar cobros.");
      return false;
    }

    setIsCreatingPayment(true);
    setPaymentError(null);

    try {
      if (isDevBypass) {
        const payment = createLocalSalaryPayment({
          amount: values.amount,
          currency: salaryCurrency,
          description: values.description,
          paymentDate: values.paymentDate,
          userId: user.id,
          walletId: selectedWalletId,
        });
        const localAllocations = values.allocations.map((allocation) =>
          createLocalSalaryAllocation({
            amount: allocation.amount,
            salaryPaymentId: payment.id,
            salaryPeriodId: allocation.salaryPeriodId,
            userId: user.id,
          }),
        );

        applyLocalSalaryPayment({
          allocations: localAllocations,
          payment,
        });
        applyWalletBalanceDelta({
          amount: values.amount,
          walletId: selectedWalletId,
        });
        addLocalEntry(
          createLocalLedgerEntry({
            amount: values.amount,
            date: values.paymentDate,
            description: values.description,
            type: "salary_payment",
            userId: user.id,
            walletId: selectedWalletId,
          }),
        );
      } else {
        await registerSalaryPayment({
          allocations: values.allocations,
          amount: values.amount,
          currency: salaryCurrency,
          description: values.description,
          paymentDate: values.paymentDate,
          walletId: selectedWalletId,
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
          refreshSalaryData({
            isDevBypass: false,
            userId: user.id,
          }),
        ]);
      }

      return true;
    } catch (caughtError) {
      setPaymentError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo registrar el cobro salarial.",
      );
      return false;
    } finally {
      setIsCreatingPayment(false);
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

      {salaryCurrency ? (
        <>
          <SalaryOverviewCard
            currency={salaryCurrency}
            overview={filteredOverview}
          />
          <SalaryPeriodComposerCard
            currency={salaryCurrency}
            isSubmitting={isCreatingPeriod}
            onSubmit={handleCreatePeriod}
            submitError={periodError}
          />
          <SalaryPaymentComposerCard
            currency={salaryCurrency}
            isSubmitting={isCreatingPayment}
            onSubmit={handleRegisterPayment}
            periods={filteredPeriods}
            submitError={paymentError}
            walletName={activeWallet?.name ?? "sin wallet"}
          />
          <SalaryPeriodListCard
            currency={salaryCurrency}
            periods={filteredPeriods}
          />
          <SalaryPaymentListCard
            currency={salaryCurrency}
            payments={filteredPayments}
          />
        </>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Moneda salarial no soportada</Text>
          <Text style={styles.infoText}>
            El modulo salarial de esta fase solo opera con wallets en USD o CUP.
          </Text>
        </View>
      )}

      {isLoading ? <Text style={styles.helperText}>Actualizando salario...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {allocations.length ? (
        <Text style={styles.helperText}>
          Asignaciones cargadas: {allocations.length}
        </Text>
      ) : null}
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
  infoCard: {
    borderRadius: 22,
    backgroundColor: "#0C1324",
    gap: 8,
    padding: 18,
  },
  infoTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  infoText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
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
