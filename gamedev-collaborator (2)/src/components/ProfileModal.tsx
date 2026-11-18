import React, { useState, useEffect } from 'react';
import { UserProfile, TreeData, AvatarConfig, AvatarGender } from '../types/game';
import { processPurchase } from '../game/rules';
import { sound } from '../utils/audio';
import {
  CharacterAvatar,
  AVATAR_CATALOG,
  AVATAR_PRESET_TEMPLATES,
  AvatarCategory,
  AvatarCatalogItem,
  AvatarPresetTemplate,
  getDefaultAvatarConfig,
  isAvatarItemUnlocked,
} from './CharacterAvatar';
import {
  HudCoinIcon,
} from './HudIcons25D';
import {
  ShieldCheck,
  Share2,
  Lock,
  Eye,
  Check,
  Sparkles,
  Copy,
  Palette,
  Shuffle,
  Settings,
  Award,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { UniversityCourse, AwardedMedalRecord } from '../university/types';
import { INITIAL_TREES, markOnboardingCompleted } from '../utils/storage';
import {
  enrollWithResearcherCode,
  exitResearchModeWithAdminToken,
  getActiveResearchSession,
  ResearchParticipantSession,
} from '../research';
import {
  signInWithGoogleAccount,
  signOutFromGoogleAccount,
} from '../firebase';

interface ProfileModalProps {
  profile: UserProfile;
  trees: TreeData[];
  onUpdateProfile: (updated: UserProfile) => void;
  onResearchSessionChanged?: () => void;
  onClose: () => void;
}

const CATEGORY_TABS: { id: AvatarCategory; label: string; icon: string }[] = [
  { id: 'hairStyle', label: 'مدل مو', icon: '💇' },
  { id: 'faceExpression', label: 'حالت صورت', icon: '😊' },
  { id: 'outfit', label: 'لباس', icon: '👕' },
  { id: 'pants', label: 'شلوار', icon: '👖' },
  { id: 'accessory', label: 'وسایل', icon: '👑' },
  { id: 'hairColor', label: 'رنگ مو', icon: '🎨' },
  { id: 'skinTone', label: 'رنگ پوست', icon: '✨' },
  { id: 'bgAura', label: 'پس‌زمینه', icon: '🌌' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  onUpdateProfile,
  onResearchSessionChanged,
  onClose,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'wardrobe' | 'settings'>('wardrobe');
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('hairStyle');

  const [name, setName] = useState<string>(profile.name);
  const [gender, setGender] = useState<AvatarGender>(profile.gender);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => ({
    ...getDefaultAvatarConfig(profile.gender),
    ...profile.avatarConfig,
  }));
  // Real-time try-on preview state so users can see ANY combination (even locked items) on the full-body avatar immediately
  const [tryOnConfig, setTryOnConfig] = useState<AvatarConfig>(() => ({
    ...getDefaultAvatarConfig(profile.gender),
    ...profile.avatarConfig,
  }));
  const [unlockedItems, setUnlockedItems] = useState<string[]>(
    profile.unlockedAvatarItems || []
  );

  const [age, setAge] = useState<number>(profile.age || 20);
  const [bio, setBio] = useState<string>(profile.bio || '');
  const [showAge, setShowAge] = useState<boolean>(profile.privacy.showAge);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [researchSession, setResearchSession] =
    useState<ResearchParticipantSession | null>(() => getActiveResearchSession());
  const [researchCodeInput, setResearchCodeInput] = useState<string>('');
  const [adminTokenInput, setAdminTokenInput] = useState<string>('');
  const [showAdminExitInput, setShowAdminExitInput] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [uniMedalsData, setUniMedalsData] = useState<{
    courses: UniversityCourse[];
    medals: AwardedMedalRecord[];
  }>({ courses: [], medals: [] });

  useEffect(() => {
    if (activeMainTab !== 'settings') return;
    let cancelled = false;
    import('../university/persistence').then(({ universityAdapter }) => {
      if (cancelled) return;
      setUniMedalsData({
        courses: universityAdapter.listCourses(),
        medals: universityAdapter.getPlayerMedals(profile.id),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeMainTab, profile.id]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 2800);
  };

  // Persist avatar changes immediately to profile
  const persistAvatarUpdate = (
    nextGender: AvatarGender,
    nextConfig: AvatarConfig,
    nextUnlocked: string[],
    nextCoins: number
  ) => {
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || 'همسفر نور',
      gender: nextGender,
      coins: nextCoins,
      avatarConfig: nextConfig,
      unlockedAvatarItems: nextUnlocked,
    };
    onUpdateProfile(updated);
  };

  // Switch between Girl and Boy base character
  const handleSelectGender = (targetGender: AvatarGender) => {
    if (targetGender === gender) return;
    sound.playClick();
    const defaultForGender = getDefaultAvatarConfig(targetGender);
    const currentHairItem = AVATAR_CATALOG.find((i) => i.id === avatarConfig.hairStyle);
    const nextHairStyle =
      currentHairItem &&
      currentHairItem.genderFilter &&
      currentHairItem.genderFilter !== 'all' &&
      currentHairItem.genderFilter !== targetGender
        ? defaultForGender.hairStyle
        : avatarConfig.hairStyle;

    const nextConfig: AvatarConfig = {
      ...avatarConfig,
      hairStyle: nextHairStyle,
    };

    setGender(targetGender);
    setAvatarConfig(nextConfig);
    setTryOnConfig(nextConfig);
    persistAvatarUpdate(targetGender, nextConfig, unlockedItems, profile.coins);
  };

  // Equip or Try-on / Purchase an individual catalog item
  const handleSelectCatalogItem = (item: AvatarCatalogItem) => {
    const isUnlocked = isAvatarItemUnlocked(item.id, unlockedItems);

    // Always update the real-time full-body try-on preview immediately!
    const nextTryOn: AvatarConfig = {
      ...tryOnConfig,
      [item.category]: item.id,
    };
    setTryOnConfig(nextTryOn);

    if (isUnlocked) {
      sound.playClick();
      const nextConfig: AvatarConfig = {
        ...avatarConfig,
        [item.category]: item.id,
      };
      setAvatarConfig(nextConfig);
      persistAvatarUpdate(gender, nextConfig, unlockedItems, profile.coins);
      showToast(`«${item.name}» روی آواتار شما قرار گرفت ✨`, 'success');
      return;
    }

    // Needs coin purchase
    const purchase = processPurchase(profile, item.cost, {
      alreadyOwned: isUnlocked,
      itemId: item.id,
    });
    if (!purchase.success) {
      sound.playClick();
      showToast(
        `پیش‌نمایش «${item.name}» روی آواتار فعال شد (برای خرید دائمی به ${item.cost} سکه نیاز دارید 🪙)`,
        'error'
      );
      return;
    }

    sound.playCoin();
    confetti({ particleCount: 55, spread: 60, origin: { y: 0.6 } });
    const nextUnlocked = Array.from(new Set([...unlockedItems, item.id]));
    const nextConfig: AvatarConfig = {
      ...avatarConfig,
      [item.category]: item.id,
    };
    setUnlockedItems(nextUnlocked);
    setAvatarConfig(nextConfig);
    setTryOnConfig(nextConfig);
    persistAvatarUpdate(gender, nextConfig, nextUnlocked, purchase.newCoins);
    showToast(`تبریک! «${item.name}» خریداری و فعال شد 🎉`, 'success');
  };

  // Calculate remaining cost for a preset template
  const getTemplateMissingCost = (
    tpl: AvatarPresetTemplate
  ): { cost: number; missingIds: string[] } => {
    const ids = Array.from(
      new Set(Object.values(tpl.config).filter((v): v is string => Boolean(v)))
    );
    let totalCost = 0;
    const missingIds: string[] = [];
    for (const id of ids) {
      if (!isAvatarItemUnlocked(id, unlockedItems)) {
        const found = AVATAR_CATALOG.find((i) => i.id === id);
        if (found && found.cost > 0) {
          totalCost += found.cost;
          missingIds.push(found.id);
        }
      }
    }
    return { cost: totalCost, missingIds };
  };

  // Apply or Purchase a Ready-Made Template
  const handleApplyTemplate = (tpl: AvatarPresetTemplate) => {
    const { cost, missingIds } = getTemplateMissingCost(tpl);
    setTryOnConfig({ ...tpl.config });

    if (cost === 0 || missingIds.length === 0) {
      sound.playClick();
      setGender(tpl.gender);
      setAvatarConfig({ ...tpl.config });
      persistAvatarUpdate(tpl.gender, { ...tpl.config }, unlockedItems, profile.coins);
      showToast(`قالب آماده «${tpl.name}» فعال شد 🌟`, 'success');
      return;
    }

    const purchase = processPurchase(profile, cost, {
      alreadyOwned: missingIds.length === 0,
      itemId: tpl.id,
    });
    if (!purchase.success) {
      sound.playClick();
      showToast(
        `پیش‌نمایش قالب «${tpl.name}» فعال شد (برای خرید دائم به ${cost} سکه نیاز دارید 🪙)`,
        'error'
      );
      return;
    }

    sound.playCoin();
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    const nextUnlocked = Array.from(new Set([...unlockedItems, ...missingIds]));
    setUnlockedItems(nextUnlocked);
    setGender(tpl.gender);
    setAvatarConfig({ ...tpl.config });
    setTryOnConfig({ ...tpl.config });
    persistAvatarUpdate(tpl.gender, { ...tpl.config }, nextUnlocked, purchase.newCoins);
    showToast(`قالب ویژه «${tpl.name}» خریداری و روی آواتار شما فعال شد! 🎉`, 'success');
  };

  // Randomize full avatar across all categories (Hair, Face, Outfit, Pants, Accessories)
  const handleRandomizeUnlocked = () => {
    sound.playClick();
    const pickRandom = (cat: AvatarCategory): string => {
      const available = AVATAR_CATALOG.filter(
        (i) =>
          i.category === cat &&
          (!i.genderFilter || i.genderFilter === 'all' || i.genderFilter === gender) &&
          isAvatarItemUnlocked(i.id, unlockedItems)
      );
      if (available.length === 0) {
        return (avatarConfig[cat] as string) || '';
      }
      return available[Math.floor(Math.random() * available.length)].id;
    };

    const nextConfig: AvatarConfig = {
      skinTone: pickRandom('skinTone'),
      hairStyle: pickRandom('hairStyle'),
      hairColor: pickRandom('hairColor'),
      faceExpression: pickRandom('faceExpression'),
      outfit: pickRandom('outfit'),
      pants: pickRandom('pants'),
      accessory: pickRandom('accessory'),
      bgAura: pickRandom('bgAura'),
    };
    setAvatarConfig(nextConfig);
    setTryOnConfig(nextConfig);
    persistAvatarUpdate(gender, nextConfig, unlockedItems, profile.coins);
    showToast('ترکیب تصادفی جدید (مو، صورت، لباس، شلوار و وسایل) ساخته شد 🎲', 'success');
  };

  const handleSaveSettings = () => {
    sound.playClick();
    markOnboardingCompleted();
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || 'همسفر نور',
      gender,
      avatarConfig,
      unlockedAvatarItems: unlockedItems,
      age,
      bio: bio.trim(),
      isGuest: false,
      privacy: {
        ...profile.privacy,
        showAge,
      },
    };
    onUpdateProfile(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);

  const handleConnectGoogle = async () => {
    if (isConnectingGoogle) return;
    sound.playClick();
    setIsConnectingGoogle(true);
    try {
      const syncedProfile = await signInWithGoogleAccount(profile);
      setName(syncedProfile.name);
      setGender(syncedProfile.gender);
      if (syncedProfile.avatarConfig) {
        setAvatarConfig(syncedProfile.avatarConfig);
        setTryOnConfig(syncedProfile.avatarConfig);
      }
      onUpdateProfile(syncedProfile);
      sound.playCoin();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast(
        `حساب جیمیل (${syncedProfile.email || syncedProfile.name}) با موفقیت متصل و همگام‌سازی شد! ✨`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        showToast(
          'خطا در اتصال به جیمیل. لطفاً پنجره پاپ‌آپ مرورگر را مسدود نکنید.',
          'error'
        );
      }
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    sound.playClick();
    try {
      await signOutFromGoogleAccount();
      try {
        window.localStorage.removeItem('angellearn_world_garden_pos_v1');
      } catch {
        // ignore storage errors
      }
      const freshGuestId = 'guest_' + Math.random().toString(36).substring(2, 9);
      const defaultAvatar = getDefaultAvatarConfig(profile.gender);
      const defaultBio = 'هر روز یک سانتیمتر بهتر شو...';
      const updated: UserProfile = {
        ...profile,
        id: freshGuestId,
        name: 'همسفر نور',
        bio: defaultBio,
        coins: 45,
        streakDays: 1,
        coords: { x: 176, y: 171 },
        avatarConfig: defaultAvatar,
        isGuest: true,
        googleConnected: false,
        email: undefined,
        photoURL: undefined,
      };
      setName('همسفر نور');
      setBio(defaultBio);
      setAvatarConfig(defaultAvatar);
      setTryOnConfig(defaultAvatar);
      onUpdateProfile(updated);
      showToast('از حساب جیمیل خارج شدید. اکنون می‌توانید با جیمیل دیگری وارد شوید.', 'success');
    } catch {
      showToast('خطا در خروج از حساب گوگل', 'error');
    }
  };

  const handleCopyShareLink = () => {
    sound.playClick();
    const shareUrl = `${window.location.origin}/?visit=${profile.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      });
    } else {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const filteredCatalog = AVATAR_CATALOG.filter(
    (item) =>
      item.category === activeCategory &&
      (!item.genderFilter || item.genderFilter === 'all' || item.genderFilter === gender)
  );

  const genderTemplates = AVATAR_PRESET_TEMPLATES.filter((t) => t.gender === gender);

  const getEquippedItemName = (cat: AvatarCategory, cfg: AvatarConfig) => {
    const val = cfg[cat];
    return AVATAR_CATALOG.find((i) => i.id === val)?.name || '';
  };

  const hasUnsavedTryOn =
    JSON.stringify(tryOnConfig) !== JSON.stringify(avatarConfig);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-1.5 sm:p-4 bg-[#040e0a]/88 animate-fadeIn"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      {/* Hand-Painted Fantasy Game Window Frame */}
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 rounded-[28px] shadow-[0_18px_50px_rgba(0,0,0,0.9),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.35)] text-slate-50 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Decorative Corner Rivets */}
        <span className="pointer-events-none absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-900 shadow-sm z-20" />
        <span className="pointer-events-none absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-900 shadow-sm z-20" />

        {/* Ornate Top Header */}
        <div className="px-2.5 py-2.5 sm:px-6 sm:py-3.5 bg-gradient-to-b from-[#132e24] via-[#0d211a] to-[#081712] border-b border-amber-400/35 shadow-[0_4px_12px_rgba(0,0,0,0.45)] flex items-center justify-between gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/assets/aistudio/Neon-Lime_Winged_Book_Emblem_9f21e0f4.png"
              alt="لوگوی انجلرن"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-lime-400/80 shadow-[0_3px_0_#451a03] shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-xs min-[360px]:text-sm sm:text-lg font-black text-amber-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate">
                استودیو ساخت آواتار تمام‌قد و نمایه باغبان
              </h2>
              <p className="text-[9.5px] sm:text-xs text-slate-200 truncate">
                انتخاب جداگانهٔ مدل مو، حالت صورت، لباس، شلوار و وسایل با پیش‌نمایش زنده در لحظه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Google Play / Gmail Connect Button or Connected Pill */}
            {!profile.googleConnected ? (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 border-2 border-sky-300 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl shadow-[0_3px_0_#64748b] text-[10.5px] sm:text-xs font-black cursor-pointer active:translate-y-0.5 transition-all disabled:opacity-60"
                title="ثبت‌نام و اتصال به حساب جیمیل (Google Play)"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 12.3s.6 3.3 1.6 5.3l3.7-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"
                  />
                </svg>
                <span className="whitespace-nowrap">
                  {isConnectingGoogle ? 'در حال اتصال...' : 'ورود با جیمیل'}
                </span>
              </button>
            ) : (
              <div
                onClick={() => setActiveMainTab('settings')}
                className="hidden sm:flex items-center gap-1.5 bg-sky-950/90 border-2 border-sky-400/70 px-2.5 py-1 rounded-2xl shadow-[0_3px_0_#082f49] cursor-pointer"
                title={profile.email || 'متصل به حساب جیمیل'}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-black text-sky-100 max-w-[120px] truncate" dir="ltr">
                  {profile.email || 'Gmail ✓'}
                </span>
              </div>
            )}

            {/* Coin Wallet Pill inside Modal */}
            <div className="flex items-center gap-1 bg-gradient-to-b from-[#1e1306] to-[#120b03] border-2 border-[#d97706] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-2xl shadow-[0_3px_0_#451a03]">
              <HudCoinIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="text-[11px] sm:text-sm font-black text-amber-300 tabular-nums whitespace-nowrap">
                {profile.coins} سکه
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              aria-label="بستن پنجره آواتار"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 border-2 border-rose-300/70 text-white flex items-center justify-center shadow-[0_3px_0_#4c0519] active:translate-y-0.5 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 3D Beveled Top Switcher Tabs: Avatar Studio vs Account Settings */}
        <div className="px-3.5 py-2 sm:px-6 bg-[#071611] border-b border-emerald-300/20 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setActiveMainTab('wardrobe');
              }}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                activeMainTab === 'wardrobe'
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'bg-[#0d211a] text-slate-200 border-emerald-300/25 hover:border-amber-400/60 shadow-[0_3px_0_#02100a]'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">ساخت آواتار (مو، صورت، لباس، شلوار)</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveMainTab('settings');
              }}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                activeMainTab === 'settings'
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'bg-[#0d211a] text-slate-200 border-emerald-300/25 hover:border-amber-400/60 shadow-[0_3px_0_#02100a]'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="truncate">مشخصات، نشان‌ها و پژوهش</span>
            </button>
          </div>
        </div>

        {/* Toast Feedback Banner */}
        {feedbackMsg && (
          <div
            className={`mx-3.5 sm:mx-6 mt-2 px-3.5 py-1.5 rounded-2xl text-xs font-black text-center border-2 transition-all shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
                : 'bg-rose-950/90 border-rose-400 text-rose-200'
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* =========================================================================
            TAB 1: REAL-TIME FULL-BODY AVATAR STUDIO & SEPARATE WARDROBE PARTS
           ========================================================================= */}
        {activeMainTab === 'wardrobe' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Pinned Live Full-Body Avatar Stage (Always Visible on Top on Mobile / Right Column on Desktop) */}
            <div className="w-full md:w-[295px] shrink-0 bg-gradient-to-b from-[#112a21] to-[#081712] border-b-2 md:border-b-0 md:border-l-2 border-[#f59e0b]/50 p-3 sm:p-4 flex flex-row md:flex-col items-center justify-between md:justify-start gap-3">
              {/* Full-Body Avatar Display */}
              <div className="relative flex flex-col items-center shrink-0">
                <div className="p-1.5 rounded-[26px] bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] shadow-[0_6px_16px_rgba(0,0,0,0.6)]">
                  <CharacterAvatar
                    gender={gender}
                    config={tryOnConfig}
                    variant="full"
                    size={112}
                    className="sm:w-[128px] sm:h-[182px]"
                  />
                </div>
                <button
                  onClick={handleRandomizeUnlocked}
                  className="-mt-2.5 z-10 bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 text-[10px] font-black px-3 py-1 rounded-full shadow-[0_2px_0_#451a03] border border-amber-100 flex items-center gap-1 cursor-pointer transition-transform hover:scale-105"
                  title="ترکیب تصادفی کل آواتار"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>ترکیب تصادفی</span>
                </button>
              </div>

              {/* Gender Switcher + Live Equipped Parts Summary */}
              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-400/40">
                    پیش‌نمایش زنده کل آواتار
                  </span>
                  {hasUnsavedTryOn && (
                    <button
                      onClick={() => {
                        sound.playClick();
                        setTryOnConfig({ ...avatarConfig });
                      }}
                      className="text-[9.5px] font-bold text-amber-200 underline cursor-pointer"
                    >
                      بازگشت به فعلی
                    </button>
                  )}
                </div>

                {/* Girl / Boy Switcher */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleSelectGender('girl')}
                    className={`px-2.5 py-1.5 rounded-xl flex items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                      gender === 'girl'
                        ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] border-amber-100 text-slate-950 font-black shadow-[0_2px_0_#78350f]'
                        : 'bg-[#0d211a] border-emerald-300/25 text-slate-200 hover:border-amber-400/50'
                    }`}
                  >
                    <span className="text-sm">👧</span>
                    <span className="text-[11px]">دختر</span>
                  </button>

                  <button
                    onClick={() => handleSelectGender('boy')}
                    className={`px-2.5 py-1.5 rounded-xl flex items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                      gender === 'boy'
                        ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] border-amber-100 text-slate-950 font-black shadow-[0_2px_0_#78350f]'
                        : 'bg-[#0d211a] border-emerald-300/25 text-slate-200 hover:border-amber-400/50'
                    }`}
                  >
                    <span className="text-sm">👦</span>
                    <span className="text-[11px]">پسر</span>
                  </button>
                </div>

                {/* Live Summary of Selected Parts (Clickable to jump to that category) */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-1 text-[10px]">
                  {[
                    { cat: 'hairStyle' as AvatarCategory, label: 'مو' },
                    { cat: 'faceExpression' as AvatarCategory, label: 'صورت' },
                    { cat: 'outfit' as AvatarCategory, label: 'لباس' },
                    { cat: 'pants' as AvatarCategory, label: 'شلوار' },
                    { cat: 'accessory' as AvatarCategory, label: 'وسیله' },
                  ].map((part) => (
                    <button
                      key={part.cat}
                      onClick={() => {
                        sound.playClick();
                        setActiveCategory(part.cat);
                      }}
                      className={`px-2 py-1 rounded-lg border text-right flex items-center justify-between gap-1 transition-all cursor-pointer ${
                        activeCategory === part.cat
                          ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-black'
                          : 'bg-[#071611] border-emerald-300/25 text-slate-200 hover:border-emerald-400/50'
                      }`}
                    >
                      <span className="text-amber-200 font-bold">{part.label}:</span>
                      <span className="truncate text-slate-100">
                        {getEquippedItemName(part.cat, tryOnConfig)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right / Bottom Scrollable Wardrobe Customizer */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
              {/* Category Selector Tabs (Hair, Face Expression, Outfit, Pants, Accessories, Colors) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-200">
                    ۱. بخش مورد نظر برای تغییر روی آواتار را انتخاب کنید:
                  </span>
                  <span className="text-[10px] text-slate-300">
                    هر تغییر در لحظه روی کل آواتار دیده می‌شود
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {CATEGORY_TABS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        sound.playClick();
                        setActiveCategory(cat.id);
                      }}
                      className={`px-1.5 py-2 rounded-xl text-[10.5px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border-2 ${
                        activeCategory === cat.id
                          ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-amber-200 shadow-[0_2px_0_#78350f] scale-[1.02]'
                          : 'bg-[#0d211a] text-slate-200 border-emerald-300/25 hover:border-amber-400/50'
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span className="truncate max-w-full">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Grid for Active Category with Full-Body Preview Cards */}
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredCatalog.map((item) => {
                    const unlocked = isAvatarItemUnlocked(item.id, unlockedItems);
                    const equipped = avatarConfig[item.category] === item.id;
                    const isTryingOn = tryOnConfig[item.category] === item.id;
                    const cardPreviewConfig: AvatarConfig = {
                      ...tryOnConfig,
                      [item.category]: item.id,
                    };

                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() =>
                          setTryOnConfig((prev) => ({
                            ...prev,
                            [item.category]: item.id,
                          }))
                        }
                        onClick={() => handleSelectCatalogItem(item)}
                        className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between transition-all cursor-pointer ${
                          equipped
                            ? 'bg-gradient-to-b from-emerald-800/90 to-emerald-950/95 border-amber-400 shadow-[0_4px_0_#78350f] scale-[1.01]'
                            : isTryingOn
                            ? 'bg-gradient-to-b from-[#0f442f] to-[#062418] border-lime-300 shadow-[0_3px_0_#02100a]'
                            : unlocked
                            ? 'bg-gradient-to-b from-[#093222]/90 to-[#041810]/95 border-emerald-800/80 hover:border-emerald-500 shadow-[0_3px_0_#02100a]'
                            : 'bg-gradient-to-b from-[#161f1b]/95 to-[#0b110e]/95 border-amber-600/50 hover:border-amber-400 shadow-[0_3px_0_#050807]'
                        }`}
                      >
                        <div className="relative">
                          <CharacterAvatar
                            gender={gender}
                            config={cardPreviewConfig}
                            variant="full"
                            size={66}
                          />
                          {item.previewColor && (
                            <span
                              className="absolute bottom-1 right-1 w-4 h-4 rounded-full border border-white shadow"
                              style={{ backgroundColor: item.previewColor }}
                            />
                          )}
                        </div>

                        <span className="text-xs font-black text-white mt-2 text-center">
                          {item.name}
                        </span>

                        <div className="mt-1.5">
                          {equipped ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-300 text-slate-950 px-2.5 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                              <span>پوشیده شده</span>
                            </span>
                          ) : unlocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#0d211a] text-slate-200 border border-emerald-300/30 px-2.5 py-0.5 rounded-full">
                              <span>
                                {item.cost === 0 ? 'رایگان · انتخاب' : 'باز شده · انتخاب'}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black bg-gradient-to-r from-[#fde68a] to-[#fbbf24] text-slate-950 px-2.5 py-0.5 rounded-full shadow">
                              <Lock className="w-3 h-3" />
                              <span>پرو / خرید ({item.cost} 🪙)</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ready-Made Full Outfits Templates */}
              <div className="pt-2 border-t border-emerald-300/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>
                      ست‌های کامل آماده ({gender === 'girl' ? 'دخترانه' : 'پسرانه'}):
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-300">
                    انتخاب یک‌جای مو، صورت، لباس و شلوار
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {genderTemplates.map((tpl) => {
                    const { cost } = getTemplateMissingCost(tpl);
                    const isCurrentTemplate =
                      avatarConfig.hairStyle === tpl.config.hairStyle &&
                      avatarConfig.outfit === tpl.config.outfit &&
                      avatarConfig.pants === tpl.config.pants &&
                      avatarConfig.accessory === tpl.config.accessory;

                    return (
                      <button
                        key={tpl.id}
                        onClick={() => handleApplyTemplate(tpl)}
                        className={`p-2.5 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer ${
                          isCurrentTemplate
                            ? 'bg-gradient-to-b from-[#1a4334] to-[#0f2920] border-amber-400 shadow-[0_4px_0_#78350f] scale-[1.02]'
                            : 'bg-[#143026] border-emerald-300/25 hover:border-amber-400/60 shadow-[0_3px_0_#02100a]'
                        }`}
                      >
                        <CharacterAvatar
                          gender={tpl.gender}
                          config={tpl.config}
                          variant="full"
                          size={58}
                        />
                        <span className="text-xs font-black text-amber-200 mt-1.5">
                          {tpl.name}
                        </span>
                        <span className="text-[9px] text-slate-300 mb-1.5">
                          {tpl.subtitle}
                        </span>

                        {isCurrentTemplate ? (
                          <span className="text-[10px] font-black bg-emerald-300 text-slate-950 px-2.5 py-0.5 rounded-full">
                            فعال ✓
                          </span>
                        ) : cost === 0 ? (
                          <span className="text-[10px] font-bold bg-teal-900/90 text-teal-100 border border-teal-400/50 px-2.5 py-0.5 rounded-full">
                            انتخاب رایگان
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-[#fbbf24] text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span>🔒</span>
                            <span>{cost} سکه 🪙</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: PROFILE SETTINGS, GOOGLE OAUTH & GARDEN SHARE LINK
           ========================================================================= */}
        {activeMainTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
            {/* Profile Form */}
            <div className="space-y-3 bg-[#143026] p-4 rounded-3xl border-2 border-[#f59e0b]/60 shadow-[0_6px_0_#03120c]">
              <div>
                <label className="block text-xs font-black text-amber-200 mb-1">
                  نام نمایشی باغبان:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={25}
                  className="w-full bg-[#071611] border-2 border-emerald-300/35 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-300 font-['Vazirmatn']"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-amber-200 mb-1">
                    سن (اختیاری):
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min={6}
                    max={99}
                    className="w-full bg-[#071611] border-2 border-emerald-300/35 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-200 mb-1">
                    حریم خصوصی سن:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAge(!showAge)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                      showAge
                        ? 'bg-emerald-800/85 border-emerald-300/70 text-white'
                        : 'bg-[#071611] border-emerald-300/30 text-slate-200'
                    }`}
                  >
                    {showAge ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>{showAge ? 'نمایش عمومی' : 'مخفی (محرمانه)'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-amber-200 mb-1">
                  بیوگرافی یک‌خطی:
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={70}
                  placeholder="مثلاً: هر روز یک گام به سوی آرامش و آگاهی..."
                  className="w-full bg-[#071611] border-2 border-emerald-300/35 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-300 font-['Vazirmatn']"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full mt-2 min-h-[44px] py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 border-2 border-[#fef08a] shadow-[0_3px_0_#78350f] active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSaved
                    ? 'تغییرات با موفقیت ذخیره شد ✓'
                    : 'ذخیره مشخصات پروفایل'}
                </span>
              </button>
            </div>

            {/* Google Play / Gmail Account Security Link */}
            <div className="bg-[#143026] p-4 rounded-3xl border-2 border-sky-400/55 space-y-2.5 shadow-[0_6px_0_#03120c]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-sky-300" />
                  <h4 className="text-xs font-black text-amber-200">
                    اتصال به جیمیل و حساب گوگل‌پلی (Google Sign-In)
                  </h4>
                </div>

                {profile.googleConnected && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/50 font-black">
                    متصل به جیمیل ✓
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-200 leading-relaxed">
                با ثبت‌نام یا ورود از طریق جیمیل، آواتار تمام‌قد، سکه‌ها و پیشرفت باغ شما به صورت آنی در فضای ابری ذخیره می‌شود تا در هر دستگاهی به آن دسترسی داشته باشید.
              </p>

              {!profile.googleConnected ? (
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs flex items-center justify-center gap-2.5 border-2 border-sky-300 shadow-[0_3px_0_#94a3b8] active:translate-y-0.5 cursor-pointer transition-all disabled:bg-slate-700 disabled:text-slate-200 disabled:border-slate-500"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 12.3s.6 3.3 1.6 5.3l3.7-2.8z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"
                    />
                  </svg>
                  <span>
                    {isConnectingGoogle
                      ? 'در حال باز کردن پنجره ورود گوگل...'
                      : 'ورود / ثبت‌نام با جیمیل (Sign in with Google)'}
                  </span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#071611] p-3 rounded-2xl border border-sky-400/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {profile.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt={profile.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full border border-sky-300 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-sky-800 border border-sky-400 flex items-center justify-center text-sm font-black shrink-0">
                        G
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        {profile.name}
                      </div>
                      {profile.email && (
                        <div className="text-[11px] text-sky-200 truncate" dir="ltr">
                          {profile.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    className="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 border border-rose-400/60 text-[11px] font-bold text-rose-100 cursor-pointer shrink-0 transition-colors"
                  >
                    خروج از جیمیل
                  </button>
                </div>
              )}
            </div>

            {/* Share Public Garden Link */}
            <div className="bg-[#143026] p-4 rounded-3xl border-2 border-emerald-300/30 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-300" />
                  لینک عمومی باغ من
                </h4>
                <p className="text-[11px] text-slate-200">
                  برای نشان دادن درختان و آواتار به دوستان
                </p>
              </div>

              <button
                onClick={handleCopyShareLink}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-emerald-700 to-emerald-900 hover:from-emerald-600 text-white font-black text-xs flex items-center gap-1.5 border border-emerald-400/60 shadow-[0_3px_0_#02100a] cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copySuccess ? 'کپی شد!' : 'کپی لینک'}</span>
              </button>
            </div>

            {/* University Medals Showcase */}
            <div className="bg-[#143026] p-4 rounded-3xl border-2 border-[#f59e0b]/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-300" />
                  ویترین نشان‌های علمی دانشگاه انجلرن
                </h4>
                <span className="text-[10px] text-amber-200 font-black">
                  {uniMedalsData.medals.length} نشان کسب‌شده
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {uniMedalsData.courses.map((course) => {
                  const earned = uniMedalsData.medals.find(
                    (m) => m.courseId === course.id
                  );
                  return (
                    <div
                      key={course.id}
                      className={`p-3 rounded-2xl border-2 flex items-center gap-3 ${
                        earned
                          ? 'bg-gradient-to-br from-amber-900/50 to-emerald-900/50 border-amber-400'
                          : 'bg-[#071611] border-emerald-300/20'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#0d211a] border border-amber-400/40 flex items-center justify-center text-xl shrink-0">
                        {earned ? course.medalConfig.artworkIcon : '🔒'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-white truncate">
                          {course.medalConfig.title}
                        </div>
                        <div className="text-[10px] text-slate-200 truncate mt-0.5">
                          {earned
                            ? `کسب شده با نمره ${earned.scorePercent}%`
                            : course.sourceStatus === 'pending_source'
                            ? 'در انتظار دریافت منبع درسی'
                            : course.isDemoCourse
                            ? 'آزمایشگاه نمونه (بدون نشان رسمی)'
                            : `نیازمند حداقل ${course.passingScore}% در آزمون`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* University Research Mode Enrollment (Identical UI for Group A & Group B) */}
            <div className="bg-[#143026] p-4 rounded-3xl border-2 border-emerald-300/35 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  حالت پژوهش دانشگاهی (Research Mode)
                </h4>
                {researchSession && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/50 font-black">
                    فعال · قفل مطالعه 🔒
                  </span>
                )}
              </div>

              {!researchSession ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    اگر در مطالعه پژوهشی شرکت می‌کنید، کد اختصاصی دریافت‌شده از پژوهشگر را وارد نمایید. پیشرفت عادی شما کاملاً محفوظ می‌ماند.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={researchCodeInput}
                      onChange={(e) => setResearchCodeInput(e.target.value)}
                      placeholder="کد پژوهشی (مثلاً ANG-A-101 یا ANG-B-101)"
                      dir="ltr"
                      className="flex-1 bg-[#071611] border-2 border-emerald-300/35 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        const outcome = enrollWithResearcherCode(
                          researchCodeInput,
                          INITIAL_TREES
                        );
                        if (outcome.success && outcome.session) {
                          setResearchSession(outcome.session);
                          setResearchCodeInput('');
                          onResearchSessionChanged?.();
                          showToast(outcome.messagePersian, 'success');
                        } else {
                          showToast(outcome.messagePersian, 'error');
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs border border-amber-200 shadow-[0_2px_0_#78350f] cursor-pointer shrink-0"
                    >
                      ثبت کد پژوهش
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-[11px] text-slate-200">
                  <div className="p-2.5 rounded-xl bg-[#071611] border border-emerald-300/25 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      شناسه شرکت‌کننده:{' '}
                      <strong dir="ltr" className="text-white">{researchSession.participantId}</strong>
                    </span>
                    <span className="text-amber-200 font-bold">
                      گروه پژوهشی تثبیت‌شده (غیرقابل تغییر در حین مطالعه)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-300">
                      پروفایل عادی شما جداگانه ذخیره شده است.
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdminExitInput((v) => !v)}
                      className="text-[10px] text-amber-200 underline hover:text-amber-100 cursor-pointer"
                    >
                      پنل سرپرست پژوهش
                    </button>
                  </div>

                  {showAdminExitInput && (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="password"
                        value={adminTokenInput}
                        onChange={(e) => setAdminTokenInput(e.target.value)}
                        placeholder="کد سرپرست پژوهش برای خروج..."
                        dir="ltr"
                        className="flex-1 bg-[#071611] border border-emerald-300/30 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const res = exitResearchModeWithAdminToken(adminTokenInput);
                          if (res.success) {
                            setResearchSession(null);
                            setAdminTokenInput('');
                            setShowAdminExitInput(false);
                            onResearchSessionChanged?.();
                            showToast(res.messagePersian, 'success');
                          } else {
                            showToast(res.messagePersian, 'error');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer"
                      >
                        خروج سرپرست
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
