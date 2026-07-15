import { FeatureGatePage } from "@/src/components/layout/FeatureGatePage";

export default function LotteryPage() {
  return (
    <FeatureGatePage
      activeItem="lottery"
      capability="lottery"
      title="Lottery"
      description="Manage lottery workflows for this store."
      unavailable="Lottery is not enabled for the selected store."
    />
  );
}
