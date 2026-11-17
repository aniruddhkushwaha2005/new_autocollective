export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6 text-sm text-slate-700 leading-relaxed">
      <h1 className="text-3xl font-display font-bold text-slate-900">Privacy Policy</h1>
      <p className="text-xs text-slate-500">Effective Date: November 2026</p>
      <p>
        AutoCollective collects only the information necessary to match vehicle purchase requests into regional buyer collectives, verify authorized dealerships, and process quotation comparisons.
      </p>
      <h2 className="text-base font-semibold text-slate-900 pt-2">1. Buyer Anonymity Inside Public Collectives</h2>
      <p>
        Public group detail views display anonymized member labels (e.g., Verified Buyer #1). Full buyer contact details are shared with an approved dealership only after you explicitly express purchase interest on a specific quotation.
      </p>
      <h2 className="text-base font-semibold text-slate-900 pt-2">2. Credentials & Security</h2>
      <p>
        Passwords are hashed using bcrypt prior to database storage. Authentication relies on signed JSON Web Tokens (JWT) with role-based access enforcement on every protected API endpoint.
      </p>
    </div>
  );
}
