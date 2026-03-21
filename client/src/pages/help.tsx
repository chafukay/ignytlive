import Layout from "@/components/layout";
import { ChevronRight, HelpCircle, MessageCircle, Mail, FileText, ChevronDown, Shield, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Help() {
  const [, setLocation] = useLocation();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    { q: "How do I start streaming?", a: "Go to your profile and tap 'Go Live'. Enter a title for your stream, select a category, and tap the Go Live button." },
    { q: "How do I earn diamonds?", a: "You earn diamonds when viewers send you gifts during your live streams. Diamonds can be converted to real money." },
    { q: "What are coins used for?", a: "Coins are used to send virtual gifts to streamers. You can purchase coins in the Store or earn them through activities." },
    { q: "How do I become VIP?", a: "Purchase a VIP membership from the Store or Coins page. VIP members get exclusive badges, features, and perks." },
    { q: "How do I report a user?", a: "Tap on the user's profile, then tap the three dots menu and select 'Report'. Choose a reason and submit." },
    { q: "Are coin purchases refundable?", a: "All coin purchases are final and non-refundable, except as required by applicable law. Please review our Terms of Service for details." },
    { q: "What is the age requirement?", a: "IgnytLIVE is for users aged 18 and older. Age verification is required during registration." },
    { q: "How do I delete my account?", a: "Go to Settings and contact our support team at support@ignytlive.com to request account deletion. Your data will be removed within 30 days." },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/settings")} className="text-foreground" data-testid="button-back">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Help & Support</h1>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="w-6 h-6 text-primary" />
            <div>
              <p className="text-foreground font-medium">Contact Support</p>
              <p className="text-muted-foreground text-sm">We typically respond within 24 hours</p>
            </div>
          </div>
          <a
            href="mailto:support@ignytlive.com"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            data-testid="link-email-support"
          >
            <Mail className="w-4 h-4" />
            support@ignytlive.com
          </a>
        </div>

        <h2 className="text-foreground font-bold mb-3">Frequently Asked Questions</h2>
        <div className="space-y-2 mb-6">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <div 
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="flex items-center gap-3 p-4 cursor-pointer"
                data-testid={`faq-item-${index}`}
              >
                <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                <p className="text-foreground flex-1 text-sm">{faq.q}</p>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${expandedFaq === index ? 'rotate-180' : ''}`} />
              </div>
              {expandedFaq === index && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-muted-foreground text-sm pl-8">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-foreground font-bold mb-3">Policies & Guidelines</h2>
        <div className="space-y-2">
          <div
            onClick={() => setLocation("/community-guidelines")}
            className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:bg-muted/50"
            data-testid="link-community-guidelines"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-foreground font-medium">Community Guidelines</p>
                <p className="text-muted-foreground text-sm">Read our rules and policies</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
            </div>
          </div>
          <div
            onClick={() => setLocation("/terms")}
            className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:bg-muted/50"
            data-testid="link-terms"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-foreground font-medium">Terms of Service</p>
                <p className="text-muted-foreground text-sm">Review our terms</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
            </div>
          </div>
          <div
            onClick={() => setLocation("/privacy-policy")}
            className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:bg-muted/50"
            data-testid="link-privacy-policy"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-foreground font-medium">Privacy Policy</p>
                <p className="text-muted-foreground text-sm">How we handle your data</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-sm text-center">
            For safety concerns or to report abuse, email{" "}
            <a href="mailto:safety@ignytlive.com" className="text-primary hover:underline" data-testid="link-safety-email">safety@ignytlive.com</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
