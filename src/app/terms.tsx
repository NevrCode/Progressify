import { LegalDocument } from "@/components/legal/LegalDocument";

export default function TermsOfService() {
  return <LegalDocument title="Terms of Service" effectiveDate="21 July 2026" sections={[
    { heading: "Using Progressify", body: "You must provide accurate registration information, protect your account credentials, use the service lawfully and be permitted to enter this agreement in your location." },
    { heading: "Health and fitness disclaimer", body: "Workout, estimated one-repetition maximum, calorie and nutrition information are estimates for personal tracking. Progressify does not provide medical advice. Consult a qualified professional before making decisions that may affect your health." },
    { heading: "Financial disclaimer", body: "Expense, budget and financial summaries are organizational tools and are not accounting, investment, tax or financial advice." },
    { heading: "Your content", body: "You retain ownership of information you enter. You grant Progressify only the permission needed to host, process and display it to operate the service." },
    { heading: "Availability and acceptable use", body: "Do not attack, reverse engineer, abuse or unlawfully access the service or another person’s data. Features may change and temporary interruptions can occur." },
    { heading: "Termination", body: "You may permanently delete your account from Profile. We may restrict accounts used unlawfully or in ways that threaten the service or other users." },
    { heading: "Liability and governing law", body: "To the extent allowed by law, the service is provided without guarantees of uninterrupted availability. Final limitation, dispute and governing-law language must be approved by qualified counsel before release." },
    { heading: "Contact", body: "Questions: support@progressify.app. This address must be activated before release." },
  ]} />;
}
