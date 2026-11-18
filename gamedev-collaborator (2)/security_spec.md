# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Master Gate & Default Deny**: Any path not explicitly matched is denied by `match /{document=**} { allow read, write: if false; }`.
2. **PII Isolation & Strictly Owner-Only Access**: `/users/{userId}` contains the player's Gmail (`email`). Read (`get`) and write (`create`, `update`, `delete`) access is strictly restricted to `isOwner(userId)` where `request.auth.uid == userId` and `request.auth.token.email_verified == true`. `list` queries on `/users` are completely forbidden (`allow list: if false;`) to prevent scraping user accounts.
3. **Path Variable Hardening**: `userId` must pass `isValidId(userId)` (`userId is string && userId.size() >= 1 && userId.size() <= 128 && userId.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Validation Blueprint (`isValidUserAccount`)**: Enforces exact required keys via `hasAll` and `hasOnly`, strict string length bounds matching `firebase-blueprint.json`, numeric range bounds for `coins` and `streakDays`, and identity integrity (`data.uid == request.auth.uid`).
5. **Temporal & Immortal Fields**: `createdAt == request.time` on creation and `incoming().createdAt == existing().createdAt` on update; `updatedAt == request.time` on both create and update; `uid` is immutable.
6. **Public World Chat Zero-PII & Verified Sender**: `/worldChatMessages/{messageId}` exposes zero PII (`senderUid`, `senderName`, avatar appearance only). Read is allowed when `isPublic == true`, while `create` strictly requires `isVerifiedUser()`, `senderUid == request.auth.uid`, valid text length `1..500`, and `createdAt == request.time`. Messages are immutable (`allow update: if false;`) and may only be deleted by their author.
7. **DM Participant Isolation (Master Gate)**: `/dmThreads/{threadId}` uses deterministic sorted participant IDs (`uidMin__uidMax`) and restricts all `get`, `list`, `create`, and `update` operations to verified users in `participants`. Subcollection `/dmThreads/{threadId}/messages/{messageId}` enforces parent thread membership via `get(...)` on `get` and `create`, verifies `incoming().participants == parent.participants` and `incoming().senderUid == request.auth.uid`, and enforces `request.auth.uid in existing().participants` on `list` with zero `get()` calls inside `allow list`.
8. **World Groups & Collaborative Building Governance**: `/groups/{groupId}` exposes public non-PII World Map presence (`buildingLevel` 1..5, `treasuryCoins`, `memberCount` 1..30). Only verified members can donate to upgrade `buildingLevel`/`treasuryCoins`, only `leaderUid` can approve/remove members or rename the group, and `/groups/{groupId}/members/{memberUid}` strictly gates joins to leader creation, leader-approved join requests, or valid pending `/groupInvites/{groupId}__{uid}` invites.
9. **Group Invites, Join Requests & Group Chat**: `/groups/{groupId}/joinRequests/{applicantUid}` is readable only by the applicant or group leader. `/groupInvites/{inviteId}` requires `isGroupLeader(groupId)` on create and is readable only by `inviterUid` or `targetUid`. `/groups/{groupId}/messages/{messageId}` strictly restricts reads, queries, and message creation to verified active group members.

## 2. The "Dirty Dozen" Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Write**: `auth = null`, creating `/users/user_1`, `/worldChatMessages/m1`, `/dmThreads/u1__u2`, or `/groups/grp_1`.
2. **Unverified Email Spoof**: `auth = { uid: 'user_1', token: { email_verified: false } }`, creating `/users/user_1`, sending a chat message, or creating a group.
3. **Cross-User Identity Spoofing (Path Mismatch)**: `auth.uid = 'attacker_1'`, writing to `/users/victim_1`.
4. **Payload UID Mismatch**: `auth.uid = 'user_1'`, writing `senderUid: 'victim_1'` to chat or `leaderUid: 'victim_1'` when creating `/groups/grp_1`.
5. **DM / Group Chat Eavesdropping**: `auth.uid = 'outsider_1'`, reading `/dmThreads/u1__u2/messages/m1` or `/groups/grp_1/messages/m1`.
6. **Unauthorized Group Membership Injection**: `auth.uid = 'outsider_1'`, writing `/groups/grp_1/members/outsider_1` without an approved join request or pending invite.
7. **Unauthorized Group Invite Creation**: Non-leader creating `/groupInvites/grp_1__victim`.
8. **String Boundary Overflow ("Denial of Wallet")**: Sending a 2000-char chat `text` or 100-char group `name`.
9. **Invalid Enum Value**: Setting `gender: 'alien'`, `role: 'superadmin'`, or `status: 'hacked'`.
10. **Building Level / Treasury Tampering**: Setting `buildingLevel: 5` on group creation, decreasing `buildingLevel` on update, or writing negative coins.
11. **Timestamp Forgery**: Setting `createdAt` or `updatedAt` to a past/future timestamp instead of `request.time`.
12. **Immortal Field Mutation**: Modifying `leaderUid` or `createdAt` on `/groups/{groupId}`, or updating chat messages.
