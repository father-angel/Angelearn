/**
 * AngelLearn - Core Types & Interfaces
 * According to GDD v1.0
 */

export type TreeId =
  | 'speed_reading'
  | 'gratitude'
  | 'deep_breathing'
  | 'bina_balls'
  | 'memory_cards'
  | 'brain_math'
  | 'poetry';

export type AvatarGender = 'boy' | 'girl';

export interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  faceExpression?: string;
  outfit: string;
  pants?: string;
  accessory: string;
  bgAura: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  gender: AvatarGender;
  age?: number;
  bio?: string;
  coins: number;
  gems?: number; // شبنم معرفت / بلور نورانی
  energy?: number; // انرژی یادگیری و تمرکز (0-100)
  maxEnergy?: number;
  mindPower?: number; // توان ذهنی (مثلا ۳.۲۶M)
  headquartersLevel?: number; // سطح عمارت باغبان (مثلا سطح ۲۰)
  vipLevel?: number; // سطح VIP / افتخار (مثلا VIP 10)
  groupId?: string;
  groupName?: string;
  coords?: { x: number; y: number }; // مختصات در نقشه جهان
  avatarConfig?: AvatarConfig;
  unlockedAvatarItems?: string[];
  isGuest: boolean;
  googleConnected: boolean;
  createdAt: string;
  lastActiveDate: string;
  lastSpringCollectedDate?: string; // YYYY-MM-DD of last daily Fountain of Life collection
  streakDays: number;
  privacy: {
    showAge: boolean;
    showGratitude: boolean;
    showStats: boolean;
  };
}

export interface QuestItem {
  id: string;
  title: string;
  target: number;
  current: number;
  rewardCoins: number;
  rewardGems: number;
  completed: boolean;
  claimed: boolean;
  category: 'daily' | 'main' | 'growth';
}

export interface MailItem {
  id: string;
  title: string;
  sender: string;
  date: string;
  content: string;
  rewardCoins?: number;
  rewardGems?: number;
  isRead: boolean;
  isClaimed: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  count: number;
  description: string;
  category: 'water' | 'seed' | 'scroll' | 'booster';
}

export interface TreeData {
  id: TreeId;
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  unlockedAt?: string;
  wateredDaysCount: number; // Total days successfully watered
  lastWateredDate?: string; // YYYY-MM-DD
  lastWateredAtMs?: number; // Epoch ms of last watering (starts 24h coin cycle)
  lastCoinTickAtMs?: number; // Epoch ms up to which 4-hour coin ticks were settled
  storedCoins?: number; // Uncollected coins banked inside this tree (capped at 1 day)
  daysWithoutWater: number;
  isWithered: boolean; // withered after 3 days without water
  position: { x: number; y: number }; // Plot coordinate (0-4)
}

export type DecorationType = 'fence' | 'bench' | 'lantern' | 'pot' | 'path' | 'flower' | 'fountain';

export interface GardenDecoration {
  id: string;
  type: DecorationType;
  name: string;
  cost: number;
  icon: string;
  x: number;
  y: number;
}

export interface GratitudeEntry {
  id: string;
  text: string;
  date: string;
  timestamp: number;
}

export interface SpeedReadingState {
  currentDay: number;
  wpm: number;
  wordsRead: number;
  completedTimeSec: number;
  passedQuestion: boolean;
}

export interface ExerciseCompletionReport {
  treeId: TreeId;
  completedReadingOrPractice: boolean;
  answeredCorrectly: boolean;
  overallSuccess: boolean;
  accuracyPercent?: number;
  durationSeconds?: number;
  startedAt?: string;
  completedAt?: string;
  wpm?: number;
  wordsRead?: number;
  timestamp: number;
  date: string;
}

export interface CourseData {
  id: string;
  building: 'school' | 'university' | 'workshop';
  title: string;
  subtitle: string;
  description: string;
  modulesCount: number;
  estimatedHours: string;
  status: 'available' | 'coming_soon';
  assessmentType: 'multiple_choice' | 'practical';
  passScore: number;
  badgeName: string;
}

export interface VisitorGarden {
  id: string;
  ownerUid?: string;
  ownerName: string;
  gender: AvatarGender;
  avatarConfig?: AvatarConfig;
  bio: string;
  level: string;
  coins: number;
  streakDays: number;
  trees: TreeData[];
  decorations: GardenDecoration[];
  coords?: { x: number; y: number };
  mindPower?: string;
}

export interface WorldChatMessage {
  id: string;
  isPublic: true;
  senderUid: string;
  senderName: string;
  senderGender: AvatarGender;
  senderAvatar: AvatarConfig;
  text: string;
  createdAtMs: number;
}

export interface DmThread {
  id: string;
  participants: [string, string];
  lastMessageText: string;
  lastMessageSenderUid: string;
  lastMessageAtMs: number;
  updatedAtMs: number;
}

export interface DmMessage {
  id: string;
  threadId: string;
  participants: [string, string];
  senderUid: string;
  senderName: string;
  text: string;
  createdAtMs: number;
}

export interface ChatTargetUser {
  uid: string;
  name: string;
  gender: AvatarGender;
  avatarConfig?: AvatarConfig;
}

export interface WorldGroup {
  id: string;
  name: string;
  motto: string;
  leaderUid: string;
  leaderName: string;
  isPublic: true;
  buildingLevel: 1 | 2 | 3 | 4 | 5;
  treasuryCoins: number;
  totalContributedCoins: number;
  memberCount: number;
  worldX: number;
  worldY: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface GroupMember {
  uid: string;
  groupId: string;
  displayName: string;
  gender: AvatarGender;
  avatarConfig: AvatarConfig;
  role: 'leader' | 'member';
  contributedCoins: number;
  joinedAtMs: number;
  updatedAtMs: number;
}

export interface GroupJoinRequest {
  groupId: string;
  leaderUid: string;
  applicantUid: string;
  applicantName: string;
  applicantGender: AvatarGender;
  applicantAvatar: AvatarConfig;
  note: string;
  status: 'pending';
  createdAtMs: number;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  inviterUid: string;
  inviterName: string;
  targetUid: string;
  targetName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAtMs: number;
  updatedAtMs: number;
}

export interface GroupChatMessage {
  id: string;
  groupId: string;
  senderUid: string;
  senderName: string;
  senderGender: AvatarGender;
  senderAvatar: AvatarConfig;
  text: string;
  createdAtMs: number;
}

export type GroupChallengeGameId =
  | 'brain_math'
  | 'bina_balls'
  | 'memory_cards'
  | 'color_trap'
  | 'logic_mind'
  | 'spatial_memory'
  | 'coordination_duel';

export interface GroupGameChallenge {
  id: string;
  groupId: string;
  gameId: GroupChallengeGameId;
  title: string;
  creatorUid: string;
  creatorName: string;
  creatorGender: AvatarGender;
  creatorAvatar: AvatarConfig;
  createdAtMs: number;
}

export interface GroupChallengeScore {
  challengeId: string;
  groupId: string;
  playerUid: string;
  playerName: string;
  playerGender: AvatarGender;
  playerAvatar: AvatarConfig;
  bestScore: number;
  bestDetail: string;
  attemptsCount: number;
  createdAtMs: number;
  updatedAtMs: number;
}

