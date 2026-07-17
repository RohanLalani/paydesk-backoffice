import { permanentRedirect } from "next/navigation";

export default function SendToPosPage() {
  permanentRedirect("/send-to-pos/multi-pack-review");
}
