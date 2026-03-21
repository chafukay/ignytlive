import { ChevronRight, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

export default function CommunityGuidelines() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/")} className="text-foreground" data-testid="button-back">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Community Guidelines</h1>
        </div>

        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl p-4 mb-6 border border-orange-500/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-400 shrink-0" />
            <div>
              <p className="text-foreground font-bold">18+ Platform</p>
              <p className="text-muted-foreground text-sm">IgnytLIVE is for adults aged 18 and older. All users must verify their age upon registration.</p>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-6">Last updated: March 21, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Our Mission</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              IgnytLIVE is built to foster a vibrant, inclusive, and safe community where creators can connect with their audiences through live streaming and social video. These guidelines ensure everyone has a positive experience.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Prohibited Content & Behavior</h2>
            
            <h3 className="text-md font-semibold text-foreground mb-1 mt-3">Violence & Threats</h3>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>No threats of violence or incitement to harm</li>
              <li>No graphic violence, gore, or depictions of physical harm</li>
              <li>No promotion of terrorism or extremist organizations</li>
            </ul>

            <h3 className="text-md font-semibold text-foreground mb-1 mt-3">Hate Speech & Harassment</h3>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>No discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin</li>
              <li>No bullying, stalking, or targeted harassment</li>
              <li>No doxxing or sharing others' private information</li>
            </ul>

            <h3 className="text-md font-semibold text-foreground mb-1 mt-3">Sexual Content</h3>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>No nudity, pornography, or sexually explicit content in streams or videos</li>
              <li>No sexual solicitation or exploitation</li>
              <li>No content involving minors in any sexual context</li>
            </ul>

            <h3 className="text-md font-semibold text-foreground mb-1 mt-3">Illegal Activities</h3>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>No promotion or facilitation of illegal activities</li>
              <li>No sale of illegal substances, weapons, or stolen goods</li>
              <li>No fraud, scams, or deceptive practices</li>
            </ul>

            <h3 className="text-md font-semibold text-foreground mb-1 mt-3">Spam & Manipulation</h3>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>No spam, unsolicited advertising, or repetitive messages</li>
              <li>No use of bots or automated accounts</li>
              <li>No manipulation of engagement metrics (fake followers, views, or gifts)</li>
              <li>No misleading or clickbait stream titles</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Live Streaming Rules</h2>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>Streamers must comply with all community guidelines during broadcasts</li>
              <li>Stream titles and thumbnails must accurately represent the content</li>
              <li>Dangerous activities, self-harm, or substance abuse are prohibited on stream</li>
              <li>Streamers are responsible for moderating their chat and audience</li>
              <li>Recording or re-streaming without consent is prohibited</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Virtual Gifts & Coins</h2>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>Do not solicit gifts through deceptive or manipulative means</li>
              <li>Do not promise real-world goods or services in exchange for gifts</li>
              <li>Do not use gifting to harass or pressure other users</li>
              <li>All coin purchases are subject to our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Private Calls</h2>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>All community guidelines apply during private calls</li>
              <li>Recording private calls without consent is prohibited</li>
              <li>Inappropriate or harassing behavior during calls will result in account action</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Intellectual Property</h2>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li>Do not use copyrighted music, videos, or other content without permission</li>
              <li>Respect trademarks and brand identities</li>
              <li>Report intellectual property violations through our support channels</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Enforcement</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">Violations of these guidelines may result in:</p>
            <ul className="text-muted-foreground text-sm space-y-1 list-disc list-inside">
              <li><strong className="text-foreground">Warning:</strong> First-time or minor violations</li>
              <li><strong className="text-foreground">Temporary Mute:</strong> Restricted from chatting for a specified duration</li>
              <li><strong className="text-foreground">Temporary Ban:</strong> Account suspended for a specified period</li>
              <li><strong className="text-foreground">Permanent Ban:</strong> Account permanently terminated for severe or repeated violations</li>
              <li><strong className="text-foreground">Content Removal:</strong> Violating content will be removed without notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">Reporting</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you encounter content or behavior that violates these guidelines, please report it using the in-app report feature (tap the three dots on a user's profile or in a stream). You can also email us at{" "}
              <a href="mailto:safety@ignytlive.com" className="text-primary hover:underline" data-testid="link-safety-email">safety@ignytlive.com</a>.
              All reports are reviewed by our moderation team.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
