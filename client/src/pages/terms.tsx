import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => window.history.back()} className="text-foreground" data-testid="button-back">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Terms of Service</h1>
        </div>

        <p className="text-muted-foreground text-sm mb-6">Last updated: March 21, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              By accessing or using IgnytLIVE ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. You must be at least 18 years old to create an account and use IgnytLIVE.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">2. Account Registration</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account. IgnytLIVE reserves the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">3. Age Requirement</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              IgnytLIVE is intended for users aged 18 and older. By using the App, you confirm that you are at least 18 years of age. We do not knowingly collect personal information from individuals under 18. If we become aware that a user is under 18, we will terminate their account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">4. User Conduct</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">You agree not to:</p>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>Post or stream content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
              <li>Engage in hate speech, discrimination, or harassment of any kind</li>
              <li>Stream or share sexually explicit content, nudity, or pornographic material</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Use the App for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to other users' accounts</li>
              <li>Use bots, scripts, or automated means to interact with the App</li>
              <li>Interfere with or disrupt the App or its servers</li>
              <li>Solicit personal information from minors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">5. Virtual Currency & Purchases</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              IgnytLIVE offers virtual currency ("Coins") that can be purchased with real money and used to send virtual gifts to other users. Coins have no real-world monetary value and cannot be exchanged for cash. All purchases of Coins are final and non-refundable, except as required by applicable law. IgnytLIVE reserves the right to modify the pricing, availability, and features of Coins at any time. Unused Coins may expire if your account is terminated.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">6. Content Ownership & License</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You retain ownership of the content you create and share on IgnytLIVE. By posting content, you grant IgnytLIVE a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute your content within the App and for promotional purposes. You represent that you have the right to share any content you post and that it does not infringe on any third party's rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">7. Moderation & Enforcement</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              IgnytLIVE reserves the right to remove any content that violates these Terms or our Community Guidelines. We may suspend, restrict, or terminate accounts that engage in prohibited behavior. Stream hosts and designated moderators may enforce additional rules within their streams, including muting or banning participants.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">8. Private Calls</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              IgnytLIVE offers private video and audio call features. These calls may be subject to per-minute or per-session charges using Coins. By using the private call feature, you agree to conduct yourself appropriately and not engage in any behavior that violates these Terms. IgnytLIVE does not record private calls.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              IgnytLIVE is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the App will be uninterrupted, secure, or error-free. We are not responsible for the content created by users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">10. Limitation of Liability</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              To the maximum extent permitted by law, IgnytLIVE and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the App. Our total liability shall not exceed the amount you have paid to IgnytLIVE in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">11. Changes to Terms</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes through the App or via email. Your continued use of the App after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">12. Contact</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you have questions about these Terms, please contact us at{" "}
              <a href="mailto:support@ignytlive.com" className="text-primary hover:underline" data-testid="link-support-email">support@ignytlive.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
