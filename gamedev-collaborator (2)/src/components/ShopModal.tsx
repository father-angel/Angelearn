import React, { useState } from 'react';
import {
  TreeData,
  GardenDecoration,
  UserProfile,
  TreeId,
  WorldGroup,
} from '../types/game';
import { AVAILABLE_DECORATIONS } from '../utils/storage';
import {
  canPurchaseItem,
  getGrowthStage,
  getStageTitle,
  getTreeCoinsPer4HoursForStage,
  getTreeCoinMaxDailyStorage,
} from '../game/rules';
import {
  GROUP_CREATE_COST,
  GROUP_UPGRADE_TIERS,
  canCreateGroupName,
  sanitizeGroupMotto,
  sanitizeGroupName,
} from '../game/groups';
import {
  createWorldGroup,
  getCurrentVerifiedUid,
  signInWithGoogleAccount,
} from '../firebase';
import { sound } from '../utils/audio';
import { TreeGraphic } from './TreeGraphic';
import { GardenDecorationGraphic } from './GardenDecorationGraphic';
import { GroupBuilding25D } from './BuildingGraphic25D';
import {
  HudCoinIcon,
  HudShopIcon,
  HudGardenNavIcon,
  HudLayoutCrateIcon,
  HudGroupTentIcon,
} from './HudIcons25D';
import { Sparkles, Check, Lock, X, MapPin, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ShopModalProps {
  profile: UserProfile;
  trees: TreeData[];
  decorations?: GardenDecoration[];
  initialTab?: 'trees' | 'decorations' | 'inventory' | 'groups';
  onUnlockTree: (treeId: TreeId, cost: number) => void;
  onBuyDecoration: (deco: Omit<GardenDecoration, 'id' | 'x' | 'y'>) => void;
  onUpdateProfile?: (updated: UserProfile) => void;
  onGroupCreated?: (group: WorldGroup) => void;
  onOpenMyGroup?: () => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  profile,
  trees,
  decorations = [],
  initialTab = 'trees',
  onUnlockTree,
  onBuyDecoration,
  onUpdateProfile,
  onGroupCreated,
  onOpenMyGroup,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'trees' | 'decorations' | 'inventory' | 'groups'
  >(initialTab);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>('');
  const [groupMotto, setGroupMotto] = useState<string>('');
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const lockedTrees = trees.filter((t) => !t.unlocked);
  const unlockedTrees = trees.filter((t) => t.unlocked);
  const verifiedUid = getCurrentVerifiedUid();
  const isAuthenticated = Boolean(verifiedUid && !profile.isGuest);

  const handleBuyTree = (tree: TreeData) => {
    if (tree.unlocked) {
      sound.playClick();
      setPurchaseNotice('این نهال قبلاً خریداری و در باغ شما کاشته شده است.');
      return;
    }

    if (!canPurchaseItem(profile.coins, tree.cost, { alreadyOwned: tree.unlocked })) {
      sound.playClick();
      setPurchaseNotice('موجودی سکه شما کافی نیست! با آبیاری درختان فعال سکه به دست آورید.');
      return;
    }

    sound.playCoin();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    onUnlockTree(tree.id, tree.cost);
    setPurchaseNotice(`نهال «${tree.name}» با موفقیت خریداری و به باغ شما اضافه شد!`);
  };

  const handleBuyDecoration = (deco: Omit<GardenDecoration, 'id' | 'x' | 'y'>) => {
    if (!canPurchaseItem(profile.coins, deco.cost)) {
      sound.playClick();
      setPurchaseNotice('موجودی سکه شما کافی نیست یا هزینه آیتم نامعتبر است!');
      return;
    }

    sound.playCoin();
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    onBuyDecoration(deco);
    setPurchaseNotice(`«${deco.name}» خریداری شد و در باغ و کوله‌پشتی شما قرار گرفت!`);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingGroup) return;

    if (!isAuthenticated) {
      setIsSigningIn(true);
      try {
        const synced = await signInWithGoogleAccount(profile);
        onUpdateProfile?.(synced);
        sound.playCoin();
      } catch {
        setPurchaseNotice('برای ساخت گروه ابتدا باید با حساب گوگل وارد شوید.');
      } finally {
        setIsSigningIn(false);
      }
      return;
    }

    if (profile.groupId) {
      setPurchaseNotice('شما هم‌اکنون عضو یک گروه هستید و نمی‌توانید گروه دوم بسازید.');
      return;
    }

    if (!canCreateGroupName(groupName)) {
      setPurchaseNotice('نام گروه باید حداقل ۲ حرف باشد.');
      return;
    }

    if (!canPurchaseItem(profile.coins, GROUP_CREATE_COST)) {
      sound.playClick();
      setPurchaseNotice(
        `برای تأسیس گروه و برپایی چادر در جهان به ${GROUP_CREATE_COST} سکه نیاز دارید.`
      );
      return;
    }

    setIsCreatingGroup(true);
    try {
      const cleanName = sanitizeGroupName(groupName);
      const cleanMotto = sanitizeGroupMotto(groupMotto);
      const created = await createWorldGroup(profile, cleanName, cleanMotto);
      const updatedProfile: UserProfile = {
        ...profile,
        coins: profile.coins - GROUP_CREATE_COST,
        groupId: created.id,
        groupName: created.name,
      };
      onUpdateProfile?.(updatedProfile);
      sound.playCoin();
      confetti({ particleCount: 95, spread: 70, origin: { y: 0.55 } });
      setPurchaseNotice(
        `گروه «${created.name}» با چادر سطح ۱ در نقشه جهان برپا شد!`
      );
      setGroupName('');
      setGroupMotto('');
      onGroupCreated?.(created);
    } catch {
      setPurchaseNotice('ساخت گروه انجام نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-1.5 sm:p-4 bg-black/88 animate-fadeIn"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      {/* Standardized Deep Obsidian & Warm Gold Modal Shell */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 rounded-[28px] shadow-[0_18px_50px_rgba(0,0,0,0.9),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.28)] text-slate-50 flex flex-col justify-between max-h-[90vh] overflow-hidden">
        {/* Decorative Corner Rivets */}
        <span className="pointer-events-none absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-900 shadow-sm z-20" />
        <span className="pointer-events-none absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-900 shadow-sm z-20" />

        {/* Ornate Top Header */}
        <div className="px-2.5 py-2.5 sm:px-6 sm:py-4 bg-gradient-to-b from-[#132e25] via-[#0d211a] to-[#091813] border-b-2 border-[#f59e0b]/55 shadow-[0_4px_12px_rgba(0,0,0,0.45)] flex items-center justify-between gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] p-0.5 shadow-[0_3px_0_#78350f] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#071611] flex items-center justify-center">
                <HudShopIcon className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-xs min-[360px]:text-sm sm:text-lg font-black text-amber-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate">
                فروشگاه و کوله‌پشتی باغ انجلرن
              </h2>
              <p className="text-[9.5px] sm:text-xs text-slate-200 truncate">
                خرید نهال، تزئینات ۲.۵بعدی، ساخت گروه در جهان و دارایی‌ها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live Coin Balance */}
            <div className="flex items-center gap-1 bg-[#120d05] border-2 border-[#f59e0b] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-2xl shadow-[0_3px_0_#451a03]">
              <HudCoinIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="text-[11px] sm:text-sm font-black text-amber-200 tabular-nums whitespace-nowrap">
                {profile.coins} سکه
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              aria-label="بستن فروشگاه"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 border-2 border-rose-200/80 text-white flex items-center justify-center shadow-[0_3px_0_#4c0519] active:translate-y-0.5 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 3D Beveled Tab Switcher: Trees | Decorations | Groups | Inventory */}
        <div className="px-2 py-2 sm:px-6 bg-[#071611] border-b border-emerald-300/20 shrink-0">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('trees');
                setPurchaseNotice(null);
              }}
              className={`min-h-[40px] sm:min-h-[42px] px-1 sm:px-2 py-1.5 rounded-2xl text-[9.5px] min-[360px]:text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                activeTab === 'trees'
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'bg-[#143026] hover:bg-[#1a3e31] text-slate-100 border-emerald-300/25 hover:border-amber-300/60 shadow-[0_3px_0_#040c09]'
              }`}
            >
              <HudGardenNavIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">نهال‌ها</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('decorations');
                setPurchaseNotice(null);
              }}
              className={`min-h-[40px] sm:min-h-[42px] px-1 sm:px-2 py-1.5 rounded-2xl text-[9.5px] min-[360px]:text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                activeTab === 'decorations'
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'bg-[#143026] hover:bg-[#1a3e31] text-slate-100 border-emerald-300/25 hover:border-amber-300/60 shadow-[0_3px_0_#040c09]'
              }`}
            >
              <HudShopIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">تزئینات</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('groups');
                setPurchaseNotice(null);
              }}
              className={`min-h-[40px] sm:min-h-[42px] px-1 sm:px-2 py-1.5 rounded-2xl text-[9.5px] min-[360px]:text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                activeTab === 'groups'
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'bg-[#143026] hover:bg-[#1a3e31] text-slate-100 border-emerald-300/25 hover:border-amber-300/60 shadow-[0_3px_0_#040c09]'
              }`}
            >
              <HudGroupTentIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">ساخت گروه</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('inventory');
                setPurchaseNotice(null);
              }}
              className={`min-h-[40px] sm:min-h-[42px] px-1 sm:px-2 py-1.5 rounded-2xl text-[9.5px] min-[360px]:text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'bg-[#143026] hover:bg-[#1a3e31] text-slate-100 border-emerald-300/25 hover:border-amber-300/60 shadow-[0_3px_0_#040c09]'
              }`}
            >
              <HudLayoutCrateIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">
                کوله‌پشتی ({unlockedTrees.length + decorations.length})
              </span>
            </button>
          </div>
        </div>

        {/* Notice feedback */}
        {purchaseNotice && (
          <div className="mx-3.5 sm:mx-6 mt-3 p-3 rounded-2xl bg-[#143026] border-2 border-amber-300/80 text-xs font-black text-amber-100 flex items-center gap-2 animate-fadeIn shrink-0 shadow-md">
            <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span>{purchaseNotice}</span>
          </div>
        )}

        {/* Items Container with Scroll */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3">
          {activeTab === 'trees' && (
            lockedTrees.length > 0 ? (
              lockedTrees.map((tree) => {
                const canAfford = canPurchaseItem(profile.coins, tree.cost);
                return (
                  <div
                    key={tree.id}
                    className="p-4 rounded-3xl bg-gradient-to-b from-[#143026] to-[#0d211a] border-2 border-[#f59e0b]/55 shadow-[0_6px_0_#040c09,inset_0_1px_0_rgba(254,240,138,0.16)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-18 h-18 rounded-2xl bg-[#071611] border-2 border-amber-400/45 flex items-center justify-center p-1 shrink-0 shadow-inner">
                        <TreeGraphic tree={tree} size={90} showShadow={false} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-black text-amber-200 truncate">
                            {tree.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-500/20 text-amber-200 border border-amber-300/45 px-2 py-0.5 rounded-lg shrink-0">
                            <Lock className="w-2.5 h-2.5" />
                            <span>نهال جدید</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed mt-1">
                          {tree.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyTree(tree)}
                      disabled={!canAfford}
                      className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-all shrink-0 ${
                        canAfford
                          ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f] active:translate-y-0.5 cursor-pointer'
                          : 'bg-slate-800/90 text-slate-300 border-slate-600/80 cursor-not-allowed'
                      }`}
                    >
                      <span>🪙 {tree.cost} سکه</span>
                      <span>· خرید نهال</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center space-y-3 bg-[#143026] rounded-3xl border-2 border-emerald-300/25 shadow-inner">
                <div className="text-3xl">🌳✨</div>
                <p className="text-xs sm:text-sm font-black text-amber-200">
                  🎉 تمام درختان مهارتی را در باغ خود کاشته‌اید!
                </p>
                <p className="text-xs text-slate-200">
                  برای مشاهده وضعیت رشد درختان و تزئینات خود، به تب «کوله‌پشتی» بروید.
                </p>
              </div>
            )
          )}

          {activeTab === 'decorations' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {AVAILABLE_DECORATIONS.map((deco, idx) => {
                const canAfford = canPurchaseItem(profile.coins, deco.cost);
                const ownedCount = decorations.filter((d) => d.type === deco.type).length;
                const previewDeco: GardenDecoration = {
                  id: `shop_preview_${idx}`,
                  type: deco.type,
                  name: deco.name,
                  icon: deco.icon,
                  x: 50,
                  y: 50,
                  cost: deco.cost,
                };

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-3xl bg-gradient-to-b from-[#143026] to-[#0d211a] border-2 border-[#f59e0b]/55 shadow-[0_6px_0_#040c09,inset_0_1px_0_rgba(254,240,138,0.16)] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-16 rounded-2xl bg-[#071611] border-2 border-emerald-300/25 flex items-center justify-center shrink-0 shadow-inner">
                        <GardenDecorationGraphic decoration={previewDeco} size={56} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-amber-200 truncate">
                          {deco.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] font-black text-amber-300">
                            🪙 {deco.cost} سکه
                          </span>
                          {ownedCount > 0 && (
                            <span className="text-[10px] font-bold bg-[#071611] text-emerald-200 border border-emerald-300/30 px-2 py-0.5 rounded-lg">
                              دارایی: {ownedCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyDecoration(deco)}
                      disabled={!canAfford}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all shrink-0 ${
                        canAfford
                          ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f] active:translate-y-0.5 cursor-pointer'
                          : 'bg-slate-800/90 text-slate-300 border-slate-600/80 cursor-not-allowed'
                      }`}
                    >
                      خرید
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-4">
              {profile.groupId ? (
                <div className="p-5 rounded-3xl bg-[#143026] border-2 border-[#f59e0b]/75 text-center space-y-3">
                  <div className="mx-auto w-24 h-20 flex items-center justify-center">
                    <GroupBuilding25D level={1} className="w-24 h-20" />
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-amber-200">
                    شما عضو گروه «{profile.groupName || 'همسفران'}» هستید
                  </h4>
                  <p className="text-xs text-slate-200">
                    می‌توانید برای کمک به ارتقای ساختمان گروه، مدیریت درخواست‌ها و گفت‌وگو وارد پنل گروه شوید.
                  </p>
                  {onOpenMyGroup && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onClose();
                        onOpenMyGroup();
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs cursor-pointer shadow-[0_3px_0_#78350f]"
                    >
                      ورود به ساختمان و مدیریت گروه
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <form
                    onSubmit={handleCreateGroup}
                    className="p-4 rounded-3xl bg-[#143026] border-2 border-[#f59e0b]/70 space-y-3.5 shadow-[0_6px_0_#040c09]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                      <div className="w-28 h-24 mx-auto sm:mx-0 rounded-2xl bg-[#071611] border-2 border-amber-400/45 flex flex-col items-center justify-center p-1 shrink-0">
                        <GroupBuilding25D level={1} className="w-24 h-20" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-black text-amber-200">
                            تأسیس گروه در جهان (چادر سطح ۱)
                          </h4>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-xl bg-amber-500/20 border border-amber-300/50 text-amber-200 tabular-nums">
                            🪙 {GROUP_CREATE_COST} سکه
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          ابتدا یک چادر کهنه در نقشه جهان برپا می‌شود. سپس شما و اعضای گروه با سرمایه‌گذاری مشترک سکه، ساختمان را تا دژ زرین ارتقا می‌دهید!
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-black text-amber-200 mb-1">
                          نام گروه (۲ تا ۴۰ حرف)
                        </label>
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value.slice(0, 40))}
                          maxLength={40}
                          placeholder="مثلاً: کاروان دانش پارسی"
                          className="w-full bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-emerald-200 mb-1">
                          شعار یا هدف گروه (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={groupMotto}
                          onChange={(e) => setGroupMotto(e.target.value.slice(0, 120))}
                          maxLength={120}
                          placeholder="مثلاً: هر روز یک قدم به‌سوی رشد و شکوفایی"
                          className="w-full bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingGroup || isSigningIn}
                      className={`w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-black border-2 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        !isAuthenticated || canPurchaseItem(profile.coins, GROUP_CREATE_COST)
                          ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                          : 'bg-slate-800/90 text-slate-300 border-slate-600/80'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>
                        {isSigningIn
                          ? 'در حال اتصال به گوگل...'
                          : !isAuthenticated
                          ? 'ورود با گوگل برای ساخت گروه'
                          : isCreatingGroup
                          ? 'در حال برپایی چادر در جهان...'
                          : `ساخت گروه و برپایی چادر در جهان (${GROUP_CREATE_COST} سکه)`}
                      </span>
                    </button>
                  </form>

                  {/* 5-Level Collaborative Upgrade Roadmap */}
                  <div className="p-4 rounded-3xl bg-[#0d211a] border border-emerald-300/25 space-y-2.5">
                    <h5 className="text-xs font-black text-amber-200">
                      مراحل تکامل ساختمان گروه (با سرمایه‌گذاری مشترک اعضا):
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {GROUP_UPGRADE_TIERS.map((tier) => (
                        <div
                          key={tier.level}
                          className="p-2 rounded-2xl bg-[#143026] border border-emerald-300/25 flex flex-col items-center text-center gap-1"
                        >
                          <GroupBuilding25D
                            level={tier.level}
                            className="w-16 h-14"
                          />
                          <span className="text-[10px] font-black text-amber-200">
                            سطح {tier.level}: {tier.title}
                          </span>
                          <span className="text-[9.5px] font-bold text-lime-200 tabular-nums">
                            {tier.nextUpgradeCost
                              ? `ارتقا: ${tier.nextUpgradeCost} سکه`
                              : 'نهایی'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4">
              {/* Owned / Planted Trees */}
              <div className="p-3.5 rounded-3xl bg-[#143026] border-2 border-emerald-300/25 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-300/20 pb-2">
                  <h4 className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5">
                    <HudGardenNavIcon className="w-4 h-4" />
                    <span>درختان کاشته‌شده در باغ ({unlockedTrees.length})</span>
                  </h4>
                  <span className="text-[10px] text-emerald-200 font-bold">
                    فعال در محوطه باغ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {unlockedTrees.map((tree) => {
                    const stage = getGrowthStage(tree.wateredDaysCount);
                    const per4h = getTreeCoinsPer4HoursForStage(stage);
                    const maxDaily = getTreeCoinMaxDailyStorage(stage);
                    return (
                      <div
                        key={tree.id}
                        className="p-2.5 rounded-2xl bg-[#071611] border border-emerald-300/25 flex items-center gap-2.5"
                      >
                        <div className="w-12 h-12 rounded-xl bg-[#0d211a] border border-amber-400/45 flex items-center justify-center shrink-0 overflow-hidden">
                          <TreeGraphic tree={tree} size={56} showShadow={false} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-white truncate">
                              {tree.name}
                            </span>
                            <span className="text-[10px] font-black text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded">
                              {getStageTitle(stage)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-200 block mt-0.5">
                            آبیاری: {tree.wateredDaysCount} از ۳۰ روز (سطح {stage + 1})
                          </span>
                          <span className="text-[10px] font-bold text-amber-200 block mt-0.5">
                            🪙 هر ۴ ساعت +{per4h} سکه · سقف یک‌روزه {maxDaily} سکه
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Owned / Placed Decorations */}
              <div className="p-3.5 rounded-3xl bg-[#143026] border-2 border-[#f59e0b]/55 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-300/20 pb-2">
                  <h4 className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5">
                    <HudLayoutCrateIcon className="w-4 h-4" />
                    <span>تزئینات چیده‌شده شما ({decorations.length})</span>
                  </h4>
                  <span className="text-[10px] text-amber-200 font-bold">
                    قابل جابه‌جایی با دکمه «چیدمان» در باغ
                  </span>
                </div>

                {decorations.length === 0 ? (
                  <p className="text-xs text-slate-200 text-center py-3">
                    هنوز تزئیناتی برای محوطه باغ خریداری نکرده‌اید.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {decorations.map((deco) => (
                      <div
                        key={deco.id}
                        className="p-2.5 rounded-2xl bg-[#071611] border border-amber-400/45 flex items-center gap-2.5"
                      >
                        <div className="w-12 h-12 rounded-xl bg-[#0d211a] border border-emerald-300/25 flex items-center justify-center shrink-0">
                          <GardenDecorationGraphic decoration={deco} size={42} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-amber-200 truncate">
                            {deco.name}
                          </div>
                          <div className="text-[10px] text-slate-200 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
                            <span>
                              موقعیت در باغ: ({Math.round(deco.x)}٪، {Math.round(deco.y)}٪)
                            </span>
                          </div>
                        </div>
                        <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#071611] border-t border-emerald-300/20 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
          <span>
            🌱 نهال‌ها، تزئینات باغ و چادر گروه شما بلافاصله در بازی قرار می‌گیرند.
          </span>
        </div>
      </div>
    </div>
  );
};
