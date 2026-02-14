import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Check, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸", region: "Americas" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "Europe" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "Americas" },
  { code: "AU", name: "Australia", flag: "🇦🇺", region: "Oceania" },
  { code: "DE", name: "Germany", flag: "🇩🇪", region: "Europe" },
  { code: "FR", name: "France", flag: "🇫🇷", region: "Europe" },
  { code: "JP", name: "Japan", flag: "🇯🇵", region: "Asia" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", region: "Asia" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", region: "Americas" },
  { code: "IN", name: "India", flag: "🇮🇳", region: "Asia" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", region: "Americas" },
  { code: "ES", name: "Spain", flag: "🇪🇸", region: "Europe" },
  { code: "IT", name: "Italy", flag: "🇮🇹", region: "Europe" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", region: "Europe" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", region: "Europe" },
  { code: "NO", name: "Norway", flag: "🇳🇴", region: "Europe" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", region: "Europe" },
  { code: "FI", name: "Finland", flag: "🇫🇮", region: "Europe" },
  { code: "PL", name: "Poland", flag: "🇵🇱", region: "Europe" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", region: "Europe" },
  { code: "RU", name: "Russia", flag: "🇷🇺", region: "Europe" },
  { code: "CN", name: "China", flag: "🇨🇳", region: "Asia" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", region: "Asia" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", region: "Asia" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", region: "Asia" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", region: "Asia" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", region: "Asia" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", region: "Asia" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", region: "Asia" },
  { code: "AE", name: "UAE", flag: "🇦🇪", region: "Middle East" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", region: "Africa" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "Africa" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "Africa" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", region: "Africa" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", region: "Americas" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", region: "Americas" },
  { code: "CL", name: "Chile", flag: "🇨🇱", region: "Americas" },
  { code: "PE", name: "Peru", flag: "🇵🇪", region: "Americas" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", region: "Europe" },
  { code: "IL", name: "Israel", flag: "🇮🇱", region: "Middle East" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", region: "Asia" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", region: "Asia" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", region: "Oceania" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", region: "Europe" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", region: "Europe" },
  { code: "AT", name: "Austria", flag: "🇦🇹", region: "Europe" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", region: "Europe" },
  { code: "GR", name: "Greece", flag: "🇬🇷", region: "Europe" },
  { code: "RO", name: "Romania", flag: "🇷🇴", region: "Europe" },
];

interface LocationPickerModalProps {
  open: boolean;
  onSelect: (countryCode: string) => void;
  onSkip: () => void;
}

export default function LocationPickerModal({ open, onSelect, onSkip }: LocationPickerModalProps) {
  const [search, setSearch] = useState("");
  const [detecting, setDetecting] = useState(true);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDetecting(true);
    api.detectCountry().then(result => {
      if (result.countryCode) {
        setDetectedCode(result.countryCode);
      }
      setDetecting(false);
    }).catch(() => setDetecting(false));
  }, [open]);

  useEffect(() => {
    if (open && !detecting && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, detecting]);

  const filtered = useMemo(() => {
    if (!search) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [search]);

  const detectedCountry = detectedCode ? COUNTRIES.find(c => c.code === detectedCode) : null;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col"
          style={{ maxHeight: '80vh' }}
        >
          <div className="p-5 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Set Your Location</h3>
              </div>
              <button
                data-testid="button-skip-location"
                onClick={onSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Your stream will appear in country-based discovery</p>
          </div>

          {detecting ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 shrink-0">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Detecting your location...</p>
            </div>
          ) : (
            <>
              {detectedCountry && (
                <div className="px-5 pt-4 pb-2 shrink-0">
                  <p className="text-xs text-muted-foreground mb-2">Detected Location</p>
                  <button
                    data-testid="button-detected-country"
                    onClick={() => onSelect(detectedCountry.code)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
                  >
                    <span className="text-2xl">{detectedCountry.flag}</span>
                    <span className="flex-1 text-left font-medium text-foreground">{detectedCountry.name}</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Detected</span>
                  </button>
                </div>
              )}

              <div className="px-5 pt-3 pb-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    data-testid="input-location-search"
                    type="text"
                    placeholder="Search countries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-muted rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 px-2">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No countries found</div>
                ) : (
                  filtered.map(country => (
                    <button
                      key={country.code}
                      data-testid={`button-location-${country.code.toLowerCase()}`}
                      onClick={() => onSelect(country.code)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors"
                    >
                      <span className="text-xl">{country.flag}</span>
                      <span className="flex-1 text-left text-sm text-foreground">{country.name}</span>
                      <span className="text-xs text-muted-foreground">{country.region}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
