import { FeaturePlaceholderScreen } from "@/components/tabs/feature-placeholder-screen";

export default function FinancesScreen() {
  return (
    <FeaturePlaceholderScreen
      description="Esta vista ya vive dentro del shell final, pero todavia no mezcla formularios ni reglas nuevas. Solo prepara el terreno para la captura de movimientos."
      eyebrow="Finanzas"
      points={[
        "Formulario rapido de ingresos y gastos sobre el ledger",
        "Historial filtrable por wallet y tipo de movimiento",
        "Acciones principales para salario, transferencias y compromisos",
      ]}
      title="Espacio listo para la operacion diaria"
    />
  );
}
