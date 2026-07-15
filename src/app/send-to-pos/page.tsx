import { BackOfficePlaceholderPage } from "@/src/components/layout/BackOfficePlaceholderPage";

export default function SendToPosPage() {
  return (
    <BackOfficePlaceholderPage
      activeItem="sendToPos"
      title="Send to POS"
      description="Publish or synchronize relevant back-office changes to store registers."
    />
  );
}
