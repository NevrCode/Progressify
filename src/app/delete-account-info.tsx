import { LegalDocument } from "@/components/legal/LegalDocument";

export default function DeleteAccountInfo() {
  return <LegalDocument title="Account Deletion" effectiveDate="21 July 2026" sections={[
    { heading: "Delete inside the app", body: "Sign in, open Profile, select Delete account, enter your current password, type DELETE and confirm. Your sessions are revoked and your account cannot be recovered." },
    { heading: "Data removed", body: "Deletion covers your identity and authentication records, profile and goals, workout history, nutrition diary and meal preparations, financial records, projects, notifications, uploads, queued changes and owner-scoped offline data on the device used for deletion." },
    { heading: "If you cannot access the app", body: "Email privacy@progressify.app from the address associated with your account and request account deletion. We will verify ownership before processing the request. The contact address must be activated before public release." },
    { heading: "Limited retention", body: "We do not retain application content after deletion. Minimal security, legal, dispute or backup records may remain only where required, access-restricted, and removed through the applicable retention cycle." },
  ]} />;
}
