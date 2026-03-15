import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { AppSwitch } from "@/components/ui/app-switch";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { listCategories } from "@/modules/categories/service";
import type { Category } from "@/modules/categories/types";
import { selectActiveWallet } from "@/modules/ledger/selectors";
import { createExpense, createManualIncome } from "@/modules/ledger/service";
import { createLocalLedgerEntry } from "@/modules/ledger/types";
import { transferBetweenWallets } from "@/modules/exchanges/service";
import { createLocalCurrencyExchange } from "@/modules/exchanges/types";
import { listIncomeSources } from "@/modules/income-sources/service";
import type { IncomeSource } from "@/modules/income-sources/types";
import { getSalaryPeriodPendingAmount } from "@/modules/salary/calculations";
import { registerSalaryPayment } from "@/modules/salary/service";
import { createLocalSalaryAllocation, createLocalSalaryPayment, type SalaryAllocationInput, type SalaryCurrency } from "@/modules/salary/types";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCommitmentStore } from "@/stores/commitment-store";
import { useExchangeStore } from "@/stores/exchange-store";
import { useLedgerStore } from "@/stores/ledger-store";
import { useSalaryStore } from "@/stores/salary-store";

type ViewMode = "movements" | "salary" | "commitments";
type FilterMode = "all" | "income" | "expense" | "transfer";
type SheetMode = "quick" | "expense" | "income" | "transfer" | "salary" | null;
type Draft = { amount: string; categoryId: string | null; date: string; description: string; destinationAmount: string; destinationWalletId: string | null; incomeSourceId: string | null; rate: string; wish: boolean };

const today = new Date().toISOString().slice(0, 10);
const entryKind = (type: string) => type === "income" || type === "salary_payment" || type === "exchange_in" ? "income" : type === "exchange_out" ? "transfer" : "expense";
const asSalaryCurrency = (value: string | null): SalaryCurrency | null => value === "USD" || value === "CUP" ? value : null;
const money = (currency: string | null, amount: number) => currency ? `${currency} ${Math.abs(amount).toFixed(2)}` : "--";
function groupLabel(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const now = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const label = date.toLocaleDateString("es-ES", { day: "2-digit", month: "long" }).toUpperCase();
  return value === now ? `HOY, ${label}` : value === yesterday ? `AYER, ${label}` : label;
}
const periodLabel = (value: string) => new Date(`${value}T00:00:00.000Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

export default function FinancesScreen() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("movements");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [draft, setDraft] = useState<Draft>({ amount: "", categoryId: null, date: today, description: "", destinationAmount: "", destinationWalletId: null, incomeSourceId: null, rate: "1", wish: false });
  const [categories, setCategories] = useState<Category[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMonth = `${today.slice(0, 7)}-01`;
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const wallets = useAppStore((state) => state.wallets);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const settings = useAppStore((state) => state.settings);
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const applyWalletBalanceDelta = useAppStore((state) => state.applyWalletBalanceDelta);
  const activeWallet = selectActiveWallet(wallets, selectedWalletId);
  const ledgerEntries = useLedgerStore((state) => state.entries);
  const refreshLedger = useLedgerStore((state) => state.refreshLedger);
  const addLocalEntry = useLedgerStore((state) => state.addLocalEntry);
  const refreshExchangeData = useExchangeStore((state) => state.refreshExchangeData);
  const addLocalExchange = useExchangeStore((state) => state.addLocalExchange);
  const refreshSalaryData = useSalaryStore((state) => state.refreshSalaryData);
  const salaryPeriods = useSalaryStore((state) => state.periods);
  const addLocalSalaryPayment = useSalaryStore((state) => state.applyLocalSalaryPayment);
  const refreshCommitmentData = useCommitmentStore((state) => state.refreshCommitmentData);
  const recurringExpenses = useCommitmentStore((state) => state.recurringExpenses);
  const budgetProvisions = useCommitmentStore((state) => state.budgetProvisions);

  useEffect(() => {
    if (!user?.id) return;
    void Promise.all([
      listCategories({ isDevBypass, userId: user.id }),
      listIncomeSources({ isDevBypass, userId: user.id }),
    ]).then(([nextCategories, nextIncomeSources]) => {
      setCategories(nextCategories);
      setIncomeSources(nextIncomeSources);
      setDraft((current) => ({ ...current, categoryId: current.categoryId ?? nextCategories[0]?.id ?? null, incomeSourceId: current.incomeSourceId ?? nextIncomeSources[0]?.id ?? null }));
    });
  }, [isDevBypass, user?.id]);

  useEffect(() => {
    if (!user?.id || !selectedWalletId) return;
    void Promise.all([
      refreshLedger({ isDevBypass, userId: user.id, walletId: selectedWalletId }),
      refreshExchangeData({ isDevBypass, userId: user.id }),
      refreshSalaryData({ isDevBypass, userId: user.id }),
      refreshCommitmentData({ isDevBypass, month: currentMonth, userId: user.id, walletId: selectedWalletId }),
    ]);
  }, [currentMonth, isDevBypass, refreshCommitmentData, refreshExchangeData, refreshLedger, refreshSalaryData, selectedWalletId, user?.id]);

  const movementGroups = useMemo(() => {
    const filtered = ledgerEntries.filter((entry) => filter === "all" || entryKind(entry.type) === filter);
    return filtered.reduce<Record<string, typeof filtered>>((groups, entry) => {
      groups[entry.date] = [...(groups[entry.date] ?? []), entry];
      return groups;
    }, {});
  }, [filter, ledgerEntries]);
  const visiblePeriods = useMemo(() => {
    const currency = asSalaryCurrency(activeWallet?.currency ?? null);
    return currency ? salaryPeriods.filter((period) => period.currency === currency) : [];
  }, [activeWallet?.currency, salaryPeriods]);
  const pendingSalary = visiblePeriods.reduce((total, period) => total + getSalaryPeriodPendingAmount(period), 0);
  const pendingMonths = visiblePeriods.filter((period) => period.status !== "covered").length;

  function openSheet(next: SheetMode) {
    setError(null);
    setIsSubmitting(false);
    setDraft((current) => ({ ...current, amount: "", date: today, description: "", destinationAmount: "", destinationWalletId: next === "transfer" ? wallets.find((wallet) => wallet.id !== selectedWalletId && wallet.isActive)?.id ?? null : current.destinationWalletId, rate: "1", wish: false }));
    setSheet(next);
  }

  async function syncAll() {
    if (!user?.id || !selectedWalletId) return;
    await Promise.all([
      refreshAppData({ isDevBypass, userId: user.id }),
      refreshLedger({ isDevBypass, userId: user.id, walletId: selectedWalletId }),
      refreshExchangeData({ isDevBypass, userId: user.id }),
      refreshSalaryData({ isDevBypass, userId: user.id }),
      refreshCommitmentData({ isDevBypass, month: currentMonth, userId: user.id, walletId: selectedWalletId }),
    ]);
  }

  async function submitSheet() {
    if (!user?.id || !selectedWalletId) {
      setError("Selecciona una wallet valida.");
      return;
    }

    const amount = Number(draft.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("El monto debe ser mayor que cero.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (sheet === "expense") {
        if (isDevBypass) {
          addLocalEntry(createLocalLedgerEntry({ amount: amount * -1, categoryId: draft.categoryId, date: draft.date, description: draft.description || (draft.wish ? "Wishlist" : "Gasto"), type: "expense", userId: user.id, walletId: selectedWalletId }));
          applyWalletBalanceDelta({ amount: amount * -1, walletId: selectedWalletId });
        } else {
          await createExpense({ amount, categoryId: draft.categoryId, date: draft.date, description: draft.description || undefined, walletId: selectedWalletId });
          await syncAll();
        }
      }

      if (sheet === "income") {
        if (isDevBypass) {
          addLocalEntry(createLocalLedgerEntry({ amount, date: draft.date, description: draft.description || "Ingreso", incomeSourceId: draft.incomeSourceId, type: "income", userId: user.id, walletId: selectedWalletId }));
          applyWalletBalanceDelta({ amount, walletId: selectedWalletId });
        } else {
          await createManualIncome({ amount, date: draft.date, description: draft.description || undefined, incomeSourceId: draft.incomeSourceId, walletId: selectedWalletId });
          await syncAll();
        }
      }

      if (sheet === "transfer") {
        if (!draft.destinationWalletId) {
          setError("Selecciona una wallet destino.");
          setIsSubmitting(false);
          return;
        }

        const destinationAmount = Number(draft.destinationAmount || draft.amount);
        const rate = Number(draft.rate);
        if (Number.isNaN(destinationAmount) || destinationAmount <= 0 || Number.isNaN(rate) || rate <= 0) {
          setError("Completa monto destino y tasa validos.");
          setIsSubmitting(false);
          return;
        }

        if (isDevBypass) {
          const exchange = createLocalCurrencyExchange({ description: draft.description || null, destinationAmount, destinationWalletId: draft.destinationWalletId, exchangeInEntryId: `local-ledger-in-${Date.now()}`, exchangeOutEntryId: `local-ledger-out-${Date.now()}`, exchangeRate: rate, sourceAmount: amount, sourceWalletId: selectedWalletId, transferDate: draft.date, userId: user.id });
          addLocalExchange(exchange);
          addLocalEntry(createLocalLedgerEntry({ amount: amount * -1, date: draft.date, description: draft.description || "Transferencia", type: "exchange_out", userId: user.id, walletId: selectedWalletId }));
          addLocalEntry(createLocalLedgerEntry({ amount: destinationAmount, date: draft.date, description: draft.description || "Transferencia", type: "exchange_in", userId: user.id, walletId: draft.destinationWalletId }));
          applyWalletBalanceDelta({ amount: amount * -1, walletId: selectedWalletId });
          applyWalletBalanceDelta({ amount: destinationAmount, walletId: draft.destinationWalletId });
        } else {
          await transferBetweenWallets({ description: draft.description || undefined, destinationAmount, destinationWalletId: draft.destinationWalletId, exchangeRate: rate, sourceAmount: amount, sourceWalletId: selectedWalletId, transferDate: draft.date });
          await syncAll();
        }
      }

      if (sheet === "salary") {
        const currency = asSalaryCurrency(activeWallet?.currency ?? null);
        if (!currency) {
          setError("La wallet activa debe ser USD o CUP.");
          setIsSubmitting(false);
          return;
        }

        const allocations: SalaryAllocationInput[] = [];
        let remaining = amount;
        for (const period of visiblePeriods) {
          const pending = getSalaryPeriodPendingAmount(period);
          if (pending <= 0 || remaining <= 0) continue;
          const allocation = Math.min(pending, remaining);
          allocations.push({ amount: allocation, salaryPeriodId: period.id });
          remaining -= allocation;
        }

        if (isDevBypass) {
          const payment = createLocalSalaryPayment({ amount, currency, description: draft.description || null, paymentDate: draft.date, userId: user.id, walletId: selectedWalletId });
          addLocalSalaryPayment({ allocations: allocations.map((item) => createLocalSalaryAllocation({ amount: item.amount, salaryPaymentId: payment.id, salaryPeriodId: item.salaryPeriodId, userId: user.id })), payment });
          addLocalEntry(createLocalLedgerEntry({ amount, date: draft.date, description: draft.description || "Cobro de salario", type: "salary_payment", userId: user.id, walletId: selectedWalletId }));
          applyWalletBalanceDelta({ amount, walletId: selectedWalletId });
        } else {
          await registerSalaryPayment({ allocations, amount, currency, description: draft.description || undefined, paymentDate: draft.date, walletId: selectedWalletId });
          await syncAll();
        }
      }

      setSheet(null);
      setIsSubmitting(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo completar la accion.");
      setIsSubmitting(false);
    }
  }

  const quickItems = [
    { icon: "arrow-up-right", label: "Registrar Gasto", tone: styles.quickRed, onPress: () => openSheet("expense") },
    { icon: "arrow-down-left", label: "Registrar Ingreso", tone: styles.quickGreen, onPress: () => openSheet("income") },
    { icon: "repeat", label: "Transferir", tone: styles.quickOrange, onPress: () => openSheet("transfer") },
    { icon: "wallet-outline", label: "Cobro de Salario", tone: styles.quickBlue, onPress: () => openSheet("salary") },
  ];
  const formTitle = sheet === "expense" ? "Registrar Gastos" : sheet === "income" ? "Registrar Ingreso" : sheet === "transfer" ? "Transferir" : "Cobro de Salario";

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        primaryAction={{ icon: "plus", onPress: () => setSheet("quick") }}
        secondaryAction={{ icon: "bell", onPress: () => router.push("/notifications"), showBadge: true }}
        title="Finanzas"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentedControl onChange={setView} options={[{ label: "Movimientos", value: "movements" }, { label: "Salario", value: "salary" }, { label: "Compromiso", value: "commitments" }]} value={view} />

        {view === "movements" ? (
          <>
            <SegmentedControl compact onChange={setFilter} options={[{ label: "Todos", value: "all" }, { label: "Ingresos", value: "income" }, { label: "Gastos", value: "expense" }, { label: "Transfer.", value: "transfer" }]} value={filter} />
            {Object.entries(movementGroups).map(([date, items]) => (
              <View key={date} style={styles.group}>
                <Text style={styles.groupLabel}>{groupLabel(date)}</Text>
                {items.map((entry) => {
                  const kind = entryKind(entry.type);
                  const meta = kind === "income" ? incomeSources.find((item) => item.id === entry.incomeSourceId)?.name ?? "Ingreso" : kind === "transfer" ? "Transferencia" : categories.find((item) => item.id === entry.categoryId)?.name ?? "Gasto";
                  return <View key={entry.id} style={styles.listCard}><View style={[styles.accent, kind === "income" ? styles.accentGreen : kind === "transfer" ? styles.accentGray : styles.accentRed]} /><View style={styles.listBody}><View style={styles.rowBetween}><Text style={styles.listTitle}>{entry.description ?? "Sin descripcion"}</Text><Text style={[styles.listAmount, kind === "income" ? styles.income : kind === "transfer" ? styles.transfer : styles.expense]}>{kind === "income" ? "+" : kind === "transfer" ? "" : "-"}${Math.abs(entry.amount).toFixed(2)}</Text></View><Text style={styles.listMeta}>{meta} • {new Date(`${entry.date}T00:00:00.000Z`).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</Text></View></View>;
                })}
              </View>
            ))}
          </>
        ) : view === "salary" ? (
          <>
            <View style={styles.statRow}><View style={styles.statCard}><Text style={styles.statLabel}>PENDIENTE</Text><Text style={styles.statValue}>${pendingSalary.toFixed(2)}</Text><Text style={styles.statMeta}>12% vs last month</Text></View><View style={styles.statCard}><Text style={styles.statLabel}>SIN PAGAR</Text><Text style={styles.statValue}>{pendingMonths} Months</Text><Text style={styles.statMeta}>Next due in 4 days</Text></View></View>
            <Text style={styles.sectionTitle}>Historial de nomina</Text>
            {visiblePeriods.map((period) => <View key={period.id} style={styles.salaryCard}><View style={[styles.iconBox, period.status === "covered" ? styles.iconGreen : period.status === "partial" ? styles.iconOrange : styles.iconRed]} /><View style={styles.cardFlex}><View style={styles.rowBetween}><Text style={styles.listTitle}>{periodLabel(period.periodMonth)}</Text><Text style={styles.pill}>{period.status.toUpperCase()}</Text></View><Text style={styles.listMeta}>${period.coveredAmount.toFixed(2)} / ${period.expectedAmount.toFixed(2)}</Text><View style={styles.track}><View style={[styles.fill, { width: `${Math.max((period.coveredAmount / Math.max(period.expectedAmount, 1)) * 100, 12)}%` }]} /></View></View></View>)}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Fijos</Text>
            {recurringExpenses.filter((item) => item.walletId === selectedWalletId).map((item) => <View key={item.id} style={styles.commitmentCard}><View style={styles.rowBetween}><Text style={styles.listTitle}>{item.name}</Text><Text style={styles.commitmentAmount}>{money(activeWallet?.currency ?? settings?.primaryCurrency ?? null, item.amount)}</Text></View><Text style={styles.listMeta}>Mensual • Proximo: {String(item.billingDay).padStart(2, "0")}</Text><View style={styles.inline}><View style={styles.dotGreen} /><Text style={styles.commitmentStatus}>PENDIENTE</Text></View></View>)}
            <Text style={styles.sectionTitle}>Eventos Especiales</Text>
            {budgetProvisions.filter((item) => item.walletId === selectedWalletId).map((item) => <View key={item.id} style={styles.commitmentCard}><View style={styles.rowBetween}><Text style={styles.listTitle}>{item.name}</Text><Text style={styles.commitmentAmount}>{money(activeWallet?.currency ?? settings?.primaryCurrency ?? null, item.amount)}</Text></View><Text style={styles.listMeta}>{item.recurrence === "yearly" ? "Anual" : "Una vez"} • Proximo: {periodLabel(item.month)}</Text><View style={styles.inline}><View style={styles.dotBlue} /><Text style={[styles.commitmentStatus, styles.commitmentMuted]}>CUMPLIDO</Text></View></View>)}
          </>
        )}
      </ScrollView>

      <BottomSheet onClose={() => setSheet(null)} visible={sheet === "quick"}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Acciones Rapidas</Text><Pressable onPress={() => setSheet(null)}><Feather color="#8A96B3" name="x" size={20} /></Pressable></View>
        <View style={styles.quickGrid}>{quickItems.map((item) => <Pressable key={item.label} onPress={item.onPress} style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}><View style={[styles.quickIcon, item.tone]}>{item.icon === "wallet-outline" ? <Ionicons color="#4B69FF" name="wallet-outline" size={22} /> : <Feather color={item.icon === "arrow-up-right" ? "#FF6B6D" : item.icon === "arrow-down-left" ? "#20D396" : "#F59E0B"} name={item.icon as "arrow-down-left" | "arrow-up-right" | "repeat"} size={22} />}</View><Text style={styles.quickLabel}>{item.label}</Text></Pressable>)}</View>
      </BottomSheet>

      <BottomSheet onClose={() => setSheet(null)} visible={sheet === "expense" || sheet === "income" || sheet === "transfer" || sheet === "salary"}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{formTitle}</Text><Pressable onPress={() => setSheet(null)}><Feather color="#8A96B3" name="x" size={20} /></Pressable></View>
        <Text style={styles.label}>MONTO</Text>
        <View style={styles.amountBox}><Text style={styles.currency}>$</Text><TextInput keyboardType="decimal-pad" onChangeText={(value) => setDraft((current) => ({ ...current, amount: value }))} style={styles.amountInput} value={draft.amount} /></View>
        <View style={styles.cols}><View style={styles.col}><Text style={styles.label}>BILLETERA</Text><View style={styles.field}><Text style={styles.fieldText}>{activeWallet?.name ?? "Efectivo"}</Text></View></View><View style={styles.col}><Text style={styles.label}>FECHA</Text><View style={styles.field}><TextInput onChangeText={(value) => setDraft((current) => ({ ...current, date: value }))} style={styles.fieldInput} value={draft.date} /></View></View></View>
        {sheet === "expense" ? <><Text style={styles.label}>CATEGORIA</Text><View style={styles.chips}>{categories.slice(0, 4).map((item) => <Pressable key={item.id} onPress={() => setDraft((current) => ({ ...current, categoryId: item.id }))} style={[styles.chip, draft.categoryId === item.id && styles.chipActive]}><Text style={[styles.chipText, draft.categoryId === item.id && styles.chipTextActive]}>{item.name}</Text></Pressable>)}</View></> : null}
        {sheet === "income" ? <><Text style={styles.label}>FUENTE</Text><View style={styles.chips}>{incomeSources.map((item) => <Pressable key={item.id} onPress={() => setDraft((current) => ({ ...current, incomeSourceId: item.id }))} style={[styles.chip, draft.incomeSourceId === item.id && styles.chipActive]}><Text style={[styles.chipText, draft.incomeSourceId === item.id && styles.chipTextActive]}>{item.name}</Text></Pressable>)}</View></> : null}
        {sheet === "transfer" ? <><Text style={styles.label}>DESTINO</Text><View style={styles.chips}>{wallets.filter((item) => item.id !== selectedWalletId && item.isActive).map((item) => <Pressable key={item.id} onPress={() => setDraft((current) => ({ ...current, destinationWalletId: item.id }))} style={[styles.chip, draft.destinationWalletId === item.id && styles.chipActive]}><Text style={[styles.chipText, draft.destinationWalletId === item.id && styles.chipTextActive]}>{item.name}</Text></Pressable>)}</View><View style={styles.cols}><View style={styles.col}><Text style={styles.label}>MONTO DESTINO</Text><View style={styles.field}><TextInput keyboardType="decimal-pad" onChangeText={(value) => setDraft((current) => ({ ...current, destinationAmount: value }))} style={styles.fieldInput} value={draft.destinationAmount} /></View></View><View style={styles.col}><Text style={styles.label}>TASA</Text><View style={styles.field}><TextInput keyboardType="decimal-pad" onChangeText={(value) => setDraft((current) => ({ ...current, rate: value }))} style={styles.fieldInput} value={draft.rate} /></View></View></View></> : null}
        <Text style={styles.label}>DESCRIPCION</Text><TextInput multiline onChangeText={(value) => setDraft((current) => ({ ...current, description: value }))} placeholder="Descripcion" placeholderTextColor="#57627F" style={styles.area} value={draft.description} />
        {sheet === "expense" ? <View style={styles.toggle}><View style={styles.toggleText}><Text style={styles.toggleTitle}>¿Es un deseo de tu wishlist?</Text><Text style={styles.soft}>Marcar como gasto no esencial</Text></View><AppSwitch onValueChange={(value) => setDraft((current) => ({ ...current, wish: value }))} value={draft.wish} /></View> : null}
        {sheet === "salary" ? <Text style={styles.soft}>Se asignara automaticamente a los periodos pendientes visibles.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={() => void submitSheet()} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{isSubmitting ? "Guardando..." : sheet === "expense" ? "Guardar Gasto" : sheet === "income" ? "Guardar Ingreso" : sheet === "transfer" ? "Guardar Transferencia" : "Guardar Cobro"}</Text></Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1020" }, content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 104, gap: 14 }, rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, inline: { flexDirection: "row", alignItems: "center", gap: 6 }, sectionTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "800" }, group: { gap: 10 }, groupLabel: { color: "#7C89A8", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }, listCard: { flexDirection: "row", borderRadius: 14, backgroundColor: "rgba(21, 28, 47, 0.96)", borderWidth: 1, borderColor: "rgba(88, 104, 149, 0.14)", overflow: "hidden" }, accent: { width: 4 }, accentGreen: { backgroundColor: "#20D396" }, accentGray: { backgroundColor: "#AAB3C8" }, accentRed: { backgroundColor: "#FF6B6D" }, listBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 4 }, listTitle: { flex: 1, color: "#F8FAFC", fontSize: 15, fontWeight: "800" }, listAmount: { fontSize: 15, fontWeight: "800" }, income: { color: "#20D396" }, transfer: { color: "#AAB3C8" }, expense: { color: "#FF6B6D" }, listMeta: { color: "#8A96B3", fontSize: 12, lineHeight: 18 }, statRow: { flexDirection: "row", gap: 12 }, statCard: { flex: 1, borderRadius: 14, backgroundColor: "rgba(21, 28, 47, 0.96)", borderWidth: 1, borderColor: "rgba(88, 104, 149, 0.14)", paddingHorizontal: 14, paddingVertical: 14, gap: 8 }, statLabel: { color: "#8A96B3", fontSize: 11, fontWeight: "800" }, statValue: { color: "#F8FAFC", fontSize: 22, fontWeight: "900" }, statMeta: { color: "#FF6B6D", fontSize: 11, fontWeight: "700" }, salaryCard: { flexDirection: "row", gap: 12, borderRadius: 14, backgroundColor: "rgba(21, 28, 47, 0.96)", borderWidth: 1, borderColor: "rgba(88, 104, 149, 0.14)", paddingHorizontal: 14, paddingVertical: 14 }, iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(49, 68, 138, 0.30)" }, iconGreen: { backgroundColor: "rgba(13, 85, 66, 0.28)" }, iconOrange: { backgroundColor: "rgba(117, 80, 23, 0.28)" }, iconRed: { backgroundColor: "rgba(124, 45, 59, 0.26)" }, cardFlex: { flex: 1, gap: 8 }, pill: { color: "#AAB3C8", fontSize: 10, fontWeight: "900" }, track: { height: 4, borderRadius: 999, backgroundColor: "rgba(92, 103, 135, 0.34)", overflow: "hidden" }, fill: { height: "100%", backgroundColor: "#4B69FF" }, commitmentCard: { borderRadius: 14, backgroundColor: "rgba(21, 28, 47, 0.96)", borderWidth: 1, borderColor: "rgba(88, 104, 149, 0.14)", paddingHorizontal: 14, paddingVertical: 14, gap: 6 }, commitmentAmount: { color: "#F8FAFC", fontSize: 15, fontWeight: "800" }, commitmentStatus: { color: "#20D396", fontSize: 11, fontWeight: "900" }, commitmentMuted: { color: "#8A96B3" }, dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#20D396" }, dotBlue: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#8A96B3" }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, sheetTitle: { color: "#F8FAFC", fontSize: 24, fontWeight: "900" }, quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, quickTile: { width: "47%", borderRadius: 16, backgroundColor: "rgba(24, 30, 51, 0.96)", borderWidth: 1, borderColor: "rgba(84, 101, 146, 0.16)", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 20, gap: 14 }, quickIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }, quickRed: { backgroundColor: "rgba(126, 43, 59, 0.30)" }, quickGreen: { backgroundColor: "rgba(13, 85, 66, 0.30)" }, quickOrange: { backgroundColor: "rgba(117, 80, 23, 0.28)" }, quickBlue: { backgroundColor: "rgba(49, 68, 138, 0.30)" }, quickLabel: { color: "#F8FAFC", fontSize: 14, fontWeight: "800", textAlign: "center" }, label: { color: "#8A96B3", fontSize: 12, fontWeight: "800", marginBottom: 8, marginTop: 8 }, amountBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, borderColor: "rgba(75, 105, 255, 0.48)", backgroundColor: "rgba(39, 46, 82, 0.38)", paddingHorizontal: 14, paddingVertical: 10 }, currency: { color: "#4B69FF", fontSize: 28, fontWeight: "900" }, amountInput: { flex: 1, color: "#F8FAFC", fontSize: 28, fontWeight: "900" }, cols: { flexDirection: "row", gap: 12 }, col: { flex: 1 }, field: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "rgba(92, 108, 149, 0.24)", backgroundColor: "#192035", justifyContent: "center", paddingHorizontal: 12 }, fieldText: { color: "#D9E3F6", fontSize: 14, fontWeight: "600" }, fieldInput: { color: "#D9E3F6", fontSize: 14, paddingVertical: 0 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, chip: { minWidth: 74, minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: "rgba(92, 108, 149, 0.24)", backgroundColor: "#192035", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, chipActive: { borderColor: "#4B69FF", backgroundColor: "rgba(75, 105, 255, 0.16)" }, chipText: { color: "#8A96B3", fontSize: 12, fontWeight: "700" }, chipTextActive: { color: "#F8FAFC" }, area: { minHeight: 88, borderRadius: 14, borderWidth: 1, borderColor: "rgba(92, 108, 149, 0.24)", backgroundColor: "#192035", color: "#D9E3F6", paddingHorizontal: 12, paddingVertical: 12, textAlignVertical: "top" }, toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 14, backgroundColor: "rgba(24, 30, 51, 0.96)", borderWidth: 1, borderColor: "rgba(84, 101, 146, 0.16)", paddingHorizontal: 14, paddingVertical: 14, marginTop: 12 }, toggleText: { flex: 1, gap: 3 }, toggleTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" }, soft: { color: "#8A96B3", fontSize: 12, lineHeight: 18 }, error: { color: "#F7A9AA", fontSize: 13, lineHeight: 20, marginTop: 12 }, button: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#4664FF", marginTop: 18 }, buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, pressed: { opacity: 0.88 },
});
