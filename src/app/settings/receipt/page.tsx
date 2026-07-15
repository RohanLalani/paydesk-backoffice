import { BackOfficePlaceholderPage } from "@/src/components/layout/BackOfficePlaceholderPage";

export default function ReceiptSettingsPage() {
  return (
    <BackOfficePlaceholderPage
      activeItem="receiptSetup"
      title="Print / Receipt Setup"
      description="Configure receipt printing and register receipt preferences for this store."
    />
  );
}
