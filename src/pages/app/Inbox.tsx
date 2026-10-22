import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { ComingSoon } from "@/components/shell/ComingSoon";

export default function Inbox() {
  return (
    <>
      <PageHeader title="Inbox" subtitle="Texts, emails and missed calls in one place" />
      <ComingSoon icon={MessageSquare} title="Your inbox is on its way">
        Soon every text, email and missed call from customers will land here, and you'll be able to reply from your phone.
      </ComingSoon>
    </>
  );
}
