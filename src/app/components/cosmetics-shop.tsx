import { saveBettorProfile, purchaseCosmetic } from "./api";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag, Ticket, Check, Sparkles, Crown, Medal, Award,
  Flame, Star, Trophy, Lock, CircleCheckBig, Zap, Heart, Shield, Gem, Target, Swords,
} from "lucide-react";
import {
  type BettorProfile,
  type CosmeticItem,
  type CosmeticCategory,
  COSMETICS_CATALOG,
} from "./betting-store";

const FONT = "'Titillium Web', sans-serif";

const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  avatar: "Avatarer",
  title: "Titlar",
  badge: "Märken",
  bundle: "Paket",
};

const CATEGORY_ICONS: Record<CosmeticCategory, typeof Sparkles> = {
  avatar: Sparkles,
  title: Award,
  badge: Medal,
  bundle: ShoppingBag,
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-primary",
  epic: "text-[var(--warning)]",
  legendary: "text-destructive",
};

const RARITY_BG: Record<string, string> = {
  common: "border-border/30",
  rare: "border-primary/20",
  epic: "border-[var(--warning)]/20",
  legendary: "border-destructive/20",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Vanlig",
  rare: "Sällsynt",
  epic: "Episk",
  legendary: "Legendarisk",
};

const BADGE_ICONS: Record<string, typeof Crown> = {
  crown: Crown,
  medal: Medal,
  award: Award,
  flame: Flame,
  star: Star,
  trophy: Trophy,
  zap: Zap,
  heart: Heart,
  shield: Shield,
  gem: Gem,
  target: Target,
  swords: Swords,
};

interface ShopProps {
  profile: BettorProfile;
  onProfileUpdate: (profile: BettorProfile) => void;
}

export function CosmeticsShop({ profile, onProfileUpdate }: ShopProps) {
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory>("avatar");
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [confirmPurchase, setConfirmPurchase] = useState<CosmeticItem | null>(null);

  const categories: CosmeticCategory[] = ["avatar", "title", "badge"];
  const items = COSMETICS_CATALOG.filter((c) => c.category === activeCategory);

  const isOwned = useCallback(
    (id: string) => profile.purchasedCosmetics.includes(id),
    [profile.purchasedCosmetics]
  );

  const isEquipped = useCallback(
    (item: CosmeticItem) => {
      switch (item.category) {
        case "avatar":
          return profile.equippedCosmetics.avatar === item.value;
        case "title":
          return profile.equippedCosmetics.title === item.value;
        case "badge":
          return profile.equippedCosmetics.badge === item.value;
        default:
          return false;
      }
    },
    [profile.equippedCosmetics]
  );

  const handlePurchase = (item: CosmeticItem) => {
    if (isOwned(item.id) || profile.balance < item.price) return;
    setConfirmPurchase(item);
  };

  /**
   * Purchase via server-side validated endpoint.
   * SECURITY: Balance deduction happens server-side.
   * The client cannot manipulate its own balance.
   */
  const confirmBuy = async () => {
    if (!confirmPurchase) return;
    const item = confirmPurchase;

    const result = await purchaseCosmetic(profile.name, item.id, item.price);
    if (result.ok && result.profile) {
      onProfileUpdate(result.profile);
      setPurchaseSuccess(item.id);
      setConfirmPurchase(null);
      setTimeout(() => setPurchaseSuccess(null), 1500);
    } else {
      console.log("Purchase failed:", result.error);
      setConfirmPurchase(null);
    }
  };

  const handleEquip = (item: CosmeticItem) => {
    if (!isOwned(item.id)) return;
    const equipped = { ...profile.equippedCosmetics };

    switch (item.category) {
      case "avatar":
        equipped.avatar = equipped.avatar === item.value ? null : item.value;
        break;
      case "title":
        equipped.title = equipped.title === item.value ? null : item.value;
        break;
      case "badge":
        equipped.badge = equipped.badge === item.value ? null : item.value;
        break;
    }

    const updated = { ...profile, equippedCosmetics: equipped };
    onProfileUpdate(updated);
    saveBettorProfile(updated);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-4.5 h-4.5 text-primary" />
          <span
            className="text-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
          >
            Butik
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)]"
          style={{ background: "var(--surface-container-highest)" }}
        >
          <Ticket className="w-3.5 h-3.5 text-primary" />
          <span
            className="text-primary tabular-nums"
            style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}
          >
            {profile.balance}
          </span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-1 rounded-[var(--radius-card)] border border-border/30" style={{ background: "var(--surface-container-low)" }}>
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[calc(var(--radius-card)-2px)] transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-surface-container-high text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-normal)" }}
            >
              <Icon className="w-3.5 h-3.5" />
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Equipped preview */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] border border-border/30"
        style={{ background: "var(--surface-container-low)" }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high border border-border/50">
          {profile.equippedCosmetics.avatar ? (
            <span style={{ fontSize: "20px" }}>{profile.equippedCosmetics.avatar}</span>
          ) : (
            <span className="text-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: 700 }}>
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground truncate" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}>
              {profile.name}
            </span>
            {profile.equippedCosmetics.badge && (() => {
              const BadgeIcon = BADGE_ICONS[profile.equippedCosmetics.badge];
              return BadgeIcon ? <BadgeIcon className="w-3.5 h-3.5 text-primary" /> : null;
            })()}
          </div>
          {profile.equippedCosmetics.title && (
            <p className="text-muted-foreground truncate" style={{ fontFamily: FONT, fontSize: "11px" }}>
              {profile.equippedCosmetics.title}
            </p>
          )}
        </div>
        <span className="text-muted-foreground/50 shrink-0" style={{ fontFamily: FONT, fontSize: "10px" }}>
          FÖRHANDSVISNING
        </span>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <AnimatePresence mode="popLayout">
          {items.map((item, idx) => {
            const owned = isOwned(item.id);
            const equipped = isEquipped(item);
            const canAfford = profile.balance >= item.price;
            const justBought = purchaseSuccess === item.id;
            const BadgePreview = item.category === "badge" ? BADGE_ICONS[item.value] : null;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                className={`relative flex flex-col rounded-[var(--radius-card)] border overflow-hidden transition-all ${
                  equipped
                    ? "border-primary/40 bg-primary/[0.04]"
                    : RARITY_BG[item.rarity]
                }`}
                style={{ background: equipped ? undefined : "var(--surface-container-low)" }}
              >
                {/* Rarity indicator */}
                <div className="absolute top-2 right-2">
                  <span
                    className={`${RARITY_COLORS[item.rarity]}`}
                    style={{ fontFamily: FONT, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    {RARITY_LABELS[item.rarity]}
                  </span>
                </div>

                {/* Preview */}
                <div className="flex items-center justify-center py-5 px-3">
                  {item.category === "avatar" && (
                    <span style={{ fontSize: "36px" }}>{item.value}</span>
                  )}
                  {item.category === "title" && (
                    <span
                      className="text-foreground text-center"
                      style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}
                    >
                      "{item.value}"
                    </span>
                  )}
                  {item.category === "badge" && BadgePreview && (
                    <BadgePreview className="w-8 h-8 text-primary" />
                  )}
                </div>

                {/* Info + action */}
                <div className="flex flex-col gap-2 px-3 pb-3">
                  <div>
                    <p
                      className="text-foreground"
                      style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                    >
                      {item.name}
                    </p>
                    <p
                      className="text-muted-foreground"
                      style={{ fontFamily: FONT, fontSize: "11px" }}
                    >
                      {item.description}
                    </p>
                  </div>

                  {owned ? (
                    <button
                      onClick={() => handleEquip(item)}
                      className={`w-full py-2 rounded-[var(--radius-button)] border transition-all cursor-pointer ${
                        equipped
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-foreground border-border/50 hover:border-primary/40"
                      }`}
                      style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {equipped ? (
                          <>
                            <CircleCheckBig className="w-3.5 h-3.5" />
                            Utrustad
                          </>
                        ) : (
                          "Utrusta"
                        )}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canAfford}
                      className={`w-full py-2 rounded-[var(--radius-button)] transition-all cursor-pointer disabled:cursor-not-allowed ${
                        canAfford
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "bg-surface-container-high text-muted-foreground/50"
                      }`}
                      style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {!canAfford && <Lock className="w-3 h-3" />}
                        <Ticket className="w-3 h-3" />
                        {item.price}
                      </span>
                    </button>
                  )}
                </div>

                {/* Just bought flash */}
                <AnimatePresence>
                  {justBought && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm rounded-[var(--radius-card)]"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15 }}
                      >
                        <Check className="w-10 h-10 text-primary" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirm purchase dialog */}
      <AnimatePresence>
        {confirmPurchase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setConfirmPurchase(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-xs rounded-[var(--radius-card)] border border-border overflow-hidden p-6 flex flex-col items-center gap-4"
              style={{ background: "var(--surface-container)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Item preview */}
              {confirmPurchase.category === "avatar" && (
                <span style={{ fontSize: "48px" }}>{confirmPurchase.value}</span>
              )}
              {confirmPurchase.category === "title" && (
                <span className="text-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-h4)", fontWeight: 700 }}>
                  "{confirmPurchase.value}"
                </span>
              )}
              {confirmPurchase.category === "badge" && (() => {
                const Icon = BADGE_ICONS[confirmPurchase.value];
                return Icon ? <Icon className="w-12 h-12 text-primary" /> : null;
              })()}

              <div className="text-center">
                <p className="text-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}>
                  Köp {confirmPurchase.name}?
                </p>
                <p className="text-muted-foreground mt-1" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                  {confirmPurchase.description}
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]" style={{ background: "var(--surface-container-highest)" }}>
                <Ticket className="w-4 h-4 text-primary" />
                <span className="text-foreground tabular-nums" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: 700 }}>
                  {confirmPurchase.price}
                </span>
                <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                  karma
                </span>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setConfirmPurchase(null)}
                  className="flex-1 py-2.5 rounded-[var(--radius-button)] border border-border/50 text-foreground hover:bg-surface-container-high transition-all cursor-pointer"
                  style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                >
                  Avbryt
                </button>
                <button
                  onClick={confirmBuy}
                  className="flex-1 py-2.5 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer"
                  style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                >
                  Köp
                </button>
              </div>

              <p className="text-muted-foreground/50" style={{ fontFamily: FONT, fontSize: "10px" }}>
                Saldo efter köp: {profile.balance - confirmPurchase.price} karma
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}