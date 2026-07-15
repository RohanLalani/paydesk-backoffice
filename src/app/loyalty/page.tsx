import { FeatureGatePage } from "@/src/components/layout/FeatureGatePage";

export default function LoyaltyPage() {
  return (
    <FeatureGatePage
      activeItem="loyalty"
      capability="loyalty"
      title="Loyalty"
      description="Manage customer loyalty tools and rewards for this store."
      unavailable="Loyalty is a paid service and is not active for the selected store."
    />
  );
}
