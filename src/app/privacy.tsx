import { LegalDocument } from "@/components/legal/LegalDocument";

export default function PrivacyPolicy() {
  return <LegalDocument title="Privacy Policy" effectiveDate="21 July 2026" sections={[
    { heading: "What Progressify collects", body: "Account details; workout and fitness history; nutrition diary, goals and food searches; optional financial records; photos you choose to upload; device-local offline data; and limited security, request and diagnostic information." },
    { heading: "Why we process it", body: "We use this information to create and secure your account, provide tracking and progress features, synchronize your devices, operate customer support, prevent abuse and keep the service reliable." },
    { heading: "Service providers", body: "Data may be processed by our hosting and database provider, Google Cloud Storage for uploads, FatSecret for proxied food searches, email delivery providers for password recovery, and monitoring providers. We do not sell personal data." },
    { heading: "Retention and deletion", body: "Active account data is retained while your account exists. Account deletion permanently removes application records and requests removal of user upload objects. Short-lived operational or security records may remain only for backup rotation, fraud prevention, legal obligations or dispute handling." },
    { heading: "Security", body: "Traffic is encrypted in transit, passwords and reset tokens are stored as one-way hashes, mobile authentication tokens use secure device storage, and access is restricted by authenticated ownership checks." },
    { heading: "Your choices", body: "You can update account information, control optional device permissions, and permanently delete your account in Profile. If you cannot access the app, use the public account deletion instructions." },
    { heading: "Contact and legal review", body: "Privacy contact: privacy@progressify.app. Support: support@progressify.app. These addresses must be activated before release. This policy requires final review for Indonesia and every market where Progressify is distributed." },
  ]} />;
}
