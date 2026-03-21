import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/")} className="text-foreground" data-testid="button-back">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
        </div>

        <p className="text-muted-foreground text-sm mb-6">Last updated: March 21, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">1. Introduction</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              IgnytLIVE ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "App"). Please read this policy carefully. By using the App, you consent to the practices described herein.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">2. Information We Collect</h2>
            <h3 className="text-md font-semibold text-foreground mb-1">2.1 Information You Provide</h3>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside mb-3">
              <li><strong className="text-foreground">Account Information:</strong> Username, email address, password (stored securely using bcrypt hashing), date of birth, and optional profile details (display name, bio, avatar)</li>
              <li><strong className="text-foreground">Phone Number:</strong> If you choose to verify your account via SMS</li>
              <li><strong className="text-foreground">Payment Information:</strong> Processed securely by Stripe; we do not store your credit card details</li>
              <li><strong className="text-foreground">Content:</strong> Live streams, short-form videos, chat messages, comments, and other content you create</li>
              <li><strong className="text-foreground">Communications:</strong> Messages you send to other users and support inquiries</li>
            </ul>

            <h3 className="text-md font-semibold text-foreground mb-1">2.2 Information Collected Automatically</h3>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li><strong className="text-foreground">Device Information:</strong> Device type, operating system, browser type, and unique device identifiers</li>
              <li><strong className="text-foreground">Usage Data:</strong> Pages visited, features used, time spent in the App, and interaction patterns</li>
              <li><strong className="text-foreground">IP Address:</strong> Used for security, rate limiting, and approximate location</li>
              <li><strong className="text-foreground">Cookies & Local Storage:</strong> Used to maintain your session and preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>To create and manage your account</li>
              <li>To provide and improve our services, including live streaming, messaging, and virtual gifting</li>
              <li>To process transactions and manage virtual currency (Coins)</li>
              <li>To send you notifications about activity on your account (follows, gifts, messages)</li>
              <li>To enforce our Terms of Service and Community Guidelines</li>
              <li>To detect and prevent fraud, abuse, and security threats</li>
              <li>To provide customer support</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">4. How We Share Your Information</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">We do not sell your personal information. We may share information with:</p>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li><strong className="text-foreground">Service Providers:</strong> Third-party services that help us operate the App (e.g., Stripe for payments, Agora for video calls, Twilio for SMS verification)</li>
              <li><strong className="text-foreground">Other Users:</strong> Your profile information, streams, and content are visible to other users as part of the App's social features</li>
              <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, regulation, or legal process</li>
              <li><strong className="text-foreground">Safety:</strong> To protect the rights, property, or safety of IgnytLIVE, our users, or the public</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">5. Data Retention</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes. Anonymized or aggregated data may be retained indefinitely for analytics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">6. Data Security</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We implement appropriate technical and organizational measures to protect your data, including encryption of passwords using bcrypt, secure HTTPS connections, rate limiting on authentication endpoints, and regular security reviews. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">7. Your Rights</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">Depending on your location, you may have the right to:</p>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground text-sm leading-relaxed mt-2">
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@ignytlive.com" className="text-primary hover:underline">privacy@ignytlive.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">8. Children's Privacy (COPPA Compliance)</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              IgnytLIVE is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18. If we discover that we have collected information from a child under 18, we will delete that information promptly. If you believe a child under 18 is using the App, please contact us at{" "}
              <a href="mailto:safety@ignytlive.com" className="text-primary hover:underline">safety@ignytlive.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">9. Third-Party Services</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">Our App integrates with the following third-party services, each with their own privacy policies:</p>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside mt-2">
              <li><strong className="text-foreground">Stripe:</strong> Payment processing for coin purchases</li>
              <li><strong className="text-foreground">Agora:</strong> Video and audio call infrastructure</li>
              <li><strong className="text-foreground">Twilio:</strong> SMS verification services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">10. International Data Transfers</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for international transfers in compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">11. Changes to This Policy</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes through the App or via email. Your continued use of the App after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">12. Contact Us</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, contact us at:<br />
              Email:{" "}
              <a href="mailto:privacy@ignytlive.com" className="text-primary hover:underline" data-testid="link-privacy-email">privacy@ignytlive.com</a><br />
              Support:{" "}
              <a href="mailto:support@ignytlive.com" className="text-primary hover:underline">support@ignytlive.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
