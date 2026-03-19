import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { Feather } from '@expo/vector-icons'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import type { Category } from '@/modules/categories/types'
import type { Wallet } from '@/modules/wallets/types'
import type { Wish } from '@/modules/wishes/types'
import { theme } from '@/utils/theme'

export type WishPurchaseDraft = {
  amount: string
  categoryId: string | null
  date: string
  description: string
}

type WishPurchaseSheetProps = {
  categories: Category[]
  draft: WishPurchaseDraft
  error: string | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: () => void
  selectedWish: Wish | null
  setDraft: React.Dispatch<React.SetStateAction<WishPurchaseDraft>>
  visible: boolean
  wallets: Wallet[]
}

export function WishPurchaseSheet({
  categories,
  draft,
  error,
  isSubmitting,
  onClose,
  onSubmit,
  selectedWish,
  setDraft,
  visible,
  wallets,
}: WishPurchaseSheetProps) {
  const wallet = wallets.find((item) => item.id === selectedWish?.walletId) ?? null
  const amount = Number(draft.amount)
  const amountIsValid = !Number.isNaN(amount) && amount > 0
  const difference =
    selectedWish && amountIsValid ? amount - selectedWish.estimatedAmount : null

  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Registrar compra</Text>
        <Pressable onPress={onClose}>
          <Feather color="#8A96B3" name="x" size={20} />
        </Pressable>
      </View>
      <Text style={styles.label}>MONTO</Text>
      <View style={styles.amountBox}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) => setDraft((current) => ({ ...current, amount: value }))}
          style={styles.amountInput}
          value={draft.amount}
        />
      </View>
      <View style={styles.cols}>
        <View style={styles.col}>
          <Text style={styles.label}>BILLETERA</Text>
          <View style={styles.field}>
            <Text style={styles.fieldText}>
              {wallet ? `${wallet.name} - ${wallet.currency}` : '--'}
            </Text>
          </View>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>FECHA</Text>
          <View style={styles.field}>
            <TextInput
              onChangeText={(value) => setDraft((current) => ({ ...current, date: value }))}
              style={styles.fieldInput}
              value={draft.date}
            />
          </View>
        </View>
      </View>
      <Text style={styles.label}>CATEGORIA</Text>
      <View style={styles.chips}>
        {categories.slice(0, 4).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setDraft((current) => ({ ...current, categoryId: item.id }))}
            style={[styles.chip, draft.categoryId === item.id && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, draft.categoryId === item.id && styles.chipTextActive]}
            >
              {item.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>DESCRIPCION</Text>
      <TextInput
        multiline
        onChangeText={(value) => setDraft((current) => ({ ...current, description: value }))}
        placeholder="Descripción"
        placeholderTextColor="#57627F"
        style={styles.area}
        value={draft.description}
      />
      {selectedWish ? (
        <View style={styles.contextCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.contextTitle}>{selectedWish.name}</Text>
            <Text style={styles.contextAmount}>
              Estimado ${selectedWish.estimatedAmount.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.soft}>
            Este gasto marcará el deseo como comprado y actualizará su monto final.
          </Text>
          {difference !== null && difference !== 0 ? (
            <Text style={styles.soft}>
              {difference > 0 ? 'Queda' : 'Baja'} ${Math.abs(difference).toFixed(2)}{' '}
              {difference > 0 ? 'por encima' : 'por debajo'} del valor estimado.
            </Text>
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={onSubmit}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Guardando...' : 'Guardar compra'}
        </Text>
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  sheetTitle: { color: theme.colors.white, fontSize: 24, fontWeight: '700' },
  label: {
    color: theme.colors.grayLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: 'rgba(39, 46, 82, 0.38)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  currency: { color: theme.colors.primary, fontSize: 28, fontWeight: '700' },
  amountInput: { flex: 1, color: theme.colors.white, fontSize: 28, fontWeight: '700' },
  cols: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  field: {
    minHeight: 42,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fieldText: { color: theme.colors.white, fontSize: 14, fontWeight: '600' },
  fieldInput: { color: theme.colors.white, fontSize: 14, paddingVertical: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    minWidth: 74,
    minHeight: 40,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.blueSoft,
  },
  chipText: { color: theme.colors.grayLight, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: theme.colors.white },
  area: {
    minHeight: 88,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    color: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    textAlignVertical: 'top',
  },
  contextCard: {
    gap: 6,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  contextTitle: { color: theme.colors.white, fontSize: 14, fontWeight: '700', flex: 1 },
  contextAmount: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  soft: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  error: { color: theme.colors.red, fontSize: 13, lineHeight: 20, marginTop: 12 },
  button: {
    minHeight: 52,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginTop: 18,
  },
  buttonText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.88 },
})
