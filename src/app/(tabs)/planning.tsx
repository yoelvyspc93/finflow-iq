import { FeaturePlaceholderScreen } from "@/components/tabs/feature-placeholder-screen";

export default function PlanningScreen() {
  return (
    <FeaturePlaceholderScreen
      description="La pestana de planificacion ya esta reservada dentro de la app, pero la logica deterministica de metas y wishlist entrara despues de cerrar Finanzas."
      eyebrow="Planificacion"
      points={[
        "Metas con progreso y aportes desde el ledger",
        "Wishlist con fecha estimada y nivel de confianza",
        "Score financiero semanal cuando exista suficiente historial",
      ]}
      title="Reservado para el motor de metas"
    />
  );
}
