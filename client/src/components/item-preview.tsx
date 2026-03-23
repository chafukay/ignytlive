import type { StoreItem } from "@shared/schema";

export const itemTypeIcons: Record<string, string> = {
  frame: "\u{1F5BC}\u{FE0F}",
  entrance: "\u{1F680}",
  badge: "\u{1F3C5}",
  chat_bubble: "\u{1F4AC}",
  effect: "\u{2728}",
  vehicle: "\u{1F697}",
};

export const frameRingColors: Record<string, { gradient: string; shadow: string }> = {
  "Golden Frame": { gradient: "from-yellow-400 via-amber-500 to-yellow-400", shadow: "shadow-[0_0_15px_rgba(250,204,21,0.5)]" },
  "Silver Frame": { gradient: "from-gray-300 via-gray-400 to-gray-300", shadow: "shadow-[0_0_12px_rgba(209,213,219,0.4)]" },
  "Diamond Frame": { gradient: "from-cyan-300 via-blue-400 to-purple-400", shadow: "shadow-[0_0_18px_rgba(103,232,249,0.5)]" },
  "Neon Frame": { gradient: "from-green-400 via-emerald-500 to-teal-400", shadow: "shadow-[0_0_18px_rgba(74,222,128,0.6)]" },
  "Rose Frame": { gradient: "from-pink-400 via-rose-500 to-red-400", shadow: "shadow-[0_0_15px_rgba(244,114,182,0.5)]" },
  "Royal Frame": { gradient: "from-purple-400 via-violet-500 to-indigo-400", shadow: "shadow-[0_0_18px_rgba(192,132,252,0.5)]" },
  "Flame Frame": { gradient: "from-orange-500 via-red-500 to-yellow-500", shadow: "shadow-[0_0_18px_rgba(249,115,22,0.5)]" },
};

export const defaultFrameRing = { gradient: "from-blue-400 via-indigo-400 to-blue-500", shadow: "shadow-[0_0_12px_rgba(96,165,250,0.4)]" };

const frameStyles: Record<string, { border: string; shadow: string; bg: string; inner: string }> = {
  "Golden Frame": {
    border: "border-[3px] border-yellow-400",
    shadow: "shadow-[0_0_15px_rgba(250,204,21,0.5),inset_0_0_10px_rgba(250,204,21,0.2)]",
    bg: "bg-gradient-to-br from-yellow-400/20 via-yellow-600/10 to-amber-500/20",
    inner: "ring-2 ring-yellow-300/50",
  },
  "Silver Frame": {
    border: "border-[3px] border-gray-300",
    shadow: "shadow-[0_0_15px_rgba(209,213,219,0.4),inset_0_0_10px_rgba(209,213,219,0.15)]",
    bg: "bg-gradient-to-br from-gray-300/20 via-gray-400/10 to-gray-200/20",
    inner: "ring-2 ring-gray-200/50",
  },
  "Diamond Frame": {
    border: "border-[3px] border-cyan-300",
    shadow: "shadow-[0_0_20px_rgba(103,232,249,0.5),inset_0_0_12px_rgba(103,232,249,0.2)]",
    bg: "bg-gradient-to-br from-cyan-300/20 via-blue-400/15 to-purple-400/20",
    inner: "ring-2 ring-cyan-200/60",
  },
  "Neon Frame": {
    border: "border-[3px] border-green-400",
    shadow: "shadow-[0_0_20px_rgba(74,222,128,0.6),inset_0_0_12px_rgba(74,222,128,0.2)]",
    bg: "bg-gradient-to-br from-green-400/20 via-emerald-500/10 to-teal-400/20",
    inner: "ring-2 ring-green-300/50",
  },
  "Rose Frame": {
    border: "border-[3px] border-pink-400",
    shadow: "shadow-[0_0_18px_rgba(244,114,182,0.5),inset_0_0_10px_rgba(244,114,182,0.2)]",
    bg: "bg-gradient-to-br from-pink-400/20 via-rose-500/10 to-red-400/20",
    inner: "ring-2 ring-pink-300/50",
  },
  "Royal Frame": {
    border: "border-[3px] border-purple-400",
    shadow: "shadow-[0_0_20px_rgba(192,132,252,0.5),inset_0_0_12px_rgba(192,132,252,0.2)]",
    bg: "bg-gradient-to-br from-purple-400/20 via-violet-500/10 to-indigo-400/20",
    inner: "ring-2 ring-purple-300/50",
  },
  "Flame Frame": {
    border: "border-[3px] border-orange-500",
    shadow: "shadow-[0_0_20px_rgba(249,115,22,0.5),inset_0_0_12px_rgba(249,115,22,0.2)]",
    bg: "bg-gradient-to-br from-orange-500/20 via-red-500/15 to-yellow-500/20",
    inner: "ring-2 ring-orange-400/50",
  },
};

const defaultFrameStyle = {
  border: "border-[3px] border-blue-400",
  shadow: "shadow-[0_0_15px_rgba(96,165,250,0.4)]",
  bg: "bg-gradient-to-br from-blue-400/20 via-indigo-400/10 to-blue-500/20",
  inner: "ring-2 ring-blue-300/40",
};

const entranceColors: Record<string, string> = {
  "Fire Entrance": "from-orange-500 via-red-500 to-yellow-500",
  "Lightning Entrance": "from-yellow-300 via-amber-400 to-yellow-500",
  "Sparkle Entrance": "from-purple-400 via-pink-400 to-blue-400",
  "Ice Entrance": "from-cyan-300 via-blue-300 to-teal-200",
  "Galaxy Entrance": "from-indigo-600 via-purple-600 to-pink-600",
};

export const badgeColors: Record<string, { bg: string; text: string; icon: string }> = {
  "VIP Badge": { bg: "from-yellow-500 to-amber-600", text: "text-white", icon: "\u{1F451}" },
  "Heart Badge": { bg: "from-pink-500 to-red-500", text: "text-white", icon: "\u{2764}\u{FE0F}" },
  "Star Badge": { bg: "from-blue-500 to-indigo-600", text: "text-white", icon: "\u{2B50}" },
  "Diamond Badge": { bg: "from-cyan-400 to-blue-500", text: "text-white", icon: "\u{1F48E}" },
  "Flame Badge": { bg: "from-orange-500 to-red-600", text: "text-white", icon: "\u{1F525}" },
};

export default function ItemPreview({ item, size = "normal" }: { item: StoreItem; size?: "normal" | "small" }) {
  const dim = size === "small" ? "w-14 h-14" : "w-full aspect-square";
  const smallMode = size === "small";

  if (item.type === "frame") {
    const style = frameStyles[item.name] || defaultFrameStyle;
    return (
      <div className={`${dim} rounded-xl ${style.bg} flex items-center justify-center ${smallMode ? 'p-1.5' : 'p-3'}`}>
        <div className={`w-full h-full rounded-full ${style.border} ${style.shadow} ${style.inner} flex items-center justify-center overflow-hidden`}>
          <div className={`${smallMode ? 'w-5 h-5' : 'w-8 h-8'} rounded-full bg-white/20 flex items-center justify-center`}>
            <span className={`text-white/60 ${smallMode ? 'text-[8px]' : 'text-xs'}`}>{"\u{1F464}"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "entrance") {
    const gradient = entranceColors[item.name] || "from-blue-500 via-purple-500 to-pink-500";
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center overflow-hidden relative`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
        <div className="relative flex flex-col items-center gap-0.5">
          <div className={`${smallMode ? 'w-7 h-7' : 'w-10 h-10'} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <span className={smallMode ? "text-sm" : "text-lg"}>{item.emoji || "\u{1F680}"}</span>
          </div>
          {!smallMode && (
            <>
              <div className={`h-1 w-16 rounded-full bg-gradient-to-r ${gradient} opacity-60`} />
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1 h-1 rounded-full bg-gradient-to-r ${gradient} opacity-${60 - i * 10}`} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (item.type === "badge") {
    const badge = badgeColors[item.name] || { bg: "from-gray-500 to-gray-600", text: "text-white", icon: "\u{1F3C5}" };
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center`}>
        <div className={`${smallMode ? 'w-9 h-9' : 'w-14 h-14'} rounded-xl bg-gradient-to-br ${badge.bg} flex items-center justify-center shadow-lg transform rotate-3`}>
          <span className={smallMode ? "text-lg" : "text-2xl"}>{badge.icon}</span>
        </div>
      </div>
    );
  }

  if (item.type === "chat_bubble") {
    const isRoyal = item.name.includes("Royal");
    const bgColor = isRoyal ? "from-purple-500/30 to-indigo-500/30 border-purple-400/50" : "from-cyan-500/30 to-blue-500/30 border-cyan-400/50";
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center`}>
        <div className={`relative bg-gradient-to-br ${bgColor} border rounded-2xl rounded-bl-sm px-2 py-1.5 max-w-[90%]`}>
          <span className={`text-white ${smallMode ? 'text-[10px]' : 'text-xs'} font-medium`}>Hello!</span>
        </div>
      </div>
    );
  }

  if (item.type === "effect") {
    const isGalaxy = item.name.includes("Galaxy");
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center overflow-hidden relative`}>
        {isGalaxy ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-black/50" />
            {[...Array(smallMode ? 4 : 8)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{
                top: `${15 + Math.random() * 70}%`,
                left: `${15 + Math.random() * 70}%`,
                animationDelay: `${i * 0.3}s`,
              }} />
            ))}
            <span className={`${smallMode ? 'text-xl' : 'text-3xl'} relative z-10`}>{"\u{1F30C}"}</span>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-green-500/10 to-blue-500/10" />
            <span className={`${smallMode ? 'text-xl' : 'text-3xl'} relative z-10`}>{"\u{1F308}"}</span>
          </>
        )}
      </div>
    );
  }

  if (item.type === "vehicle") {
    const isCar = item.name.includes("Car");
    return (
      <div className={`${dim} rounded-xl bg-white/5 flex items-center justify-center overflow-hidden relative`}>
        <div className={`absolute inset-0 bg-gradient-to-t ${isCar ? 'from-red-500/10 to-transparent' : 'from-blue-500/10 to-transparent'}`} />
        <span className={`${smallMode ? 'text-2xl' : 'text-4xl'} relative z-10`}>{isCar ? "\u{1F3CE}\u{FE0F}" : "\u{1F680}"}</span>
      </div>
    );
  }

  return (
    <div className={`${dim} rounded-xl bg-white/10 flex items-center justify-center ${smallMode ? 'text-2xl' : 'text-4xl'}`}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className={`${smallMode ? 'w-10 h-10' : 'w-16 h-16'} object-contain`} />
      ) : (
        item.emoji || itemTypeIcons[item.type] || "\u{1F4E6}"
      )}
    </div>
  );
}
