import Layout from "@/components/layout";
import { ChevronRight, HelpCircle, MessageCircle, Mail, FileText, ChevronDown } from "lucide-react";
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
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/settings")} className="text-white">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">Help & Support</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center cursor-pointer hover:bg-white/10">
            <MessageCircle className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-white font-medium text-sm">Live Chat</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center cursor-pointer hover:bg-white/10">
            <Mail className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-white font-medium text-sm">Email Us</p>
          </div>
        </div>

        <h2 className="text-white font-bold mb-3">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
            >
              <div 
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="flex items-center gap-3 p-4 cursor-pointer"
              >
                <HelpCircle className="w-5 h-5 text-primary" />
                <p className="text-white flex-1">{faq.q}</p>
                <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`} />
              </div>
              {expandedFaq === index && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-white/70 text-sm pl-8">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white/70" />
            <div>
              <p className="text-white font-medium">Community Guidelines</p>
              <p className="text-white/50 text-sm">Read our rules and policies</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 ml-auto" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
