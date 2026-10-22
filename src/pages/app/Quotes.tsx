import { FileText } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { ComingSoon } from "@/components/shell/ComingSoon";

export default function Quotes() {
  return (
    <>
      <PageHeader title="Quotes" subtitle="Send quotes customers can accept on their phone" />
      <ComingSoon icon={FileText} title="Quoting is coming soon">
        Build a quote in under a minute, with GST worked out for you, and text it straight to the customer.
      </ComingSoon>
    </>
  );
}
