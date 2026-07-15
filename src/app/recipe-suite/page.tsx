import { FeatureGatePage } from "@/src/components/layout/FeatureGatePage";

export default function RecipeSuitePage() {
  return (
    <FeatureGatePage
      activeItem="recipeSuite"
      capability="recipeSuite"
      title="Recipe Suite"
      description="Manage broader recipe, production, and preparation workflows."
      unavailable="Recipe Suite is not enabled for the selected store."
    />
  );
}
