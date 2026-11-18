import React from 'react';

/**
 * Hand-Painted Isometric 2.5D Game HUD Illustrated Icons
 * Designed for AngelLearn's mobile strategy / fantasy garden interface.
 * Lightweight memoized inline SVGs with volumetric shading and specular highlights.
 */

export const HudCoinIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <ellipse cx="16" cy="28" rx="11" ry="3" fill="rgba(0,0,0,0.45)" />
    <circle
      cx="16"
      cy="16.5"
      r="12"
      fill="#b45309"
      stroke="#451a03"
      strokeWidth="1.8"
    />
    <circle
      cx="15.5"
      cy="14.8"
      r="11.5"
      fill="#fbbf24"
      stroke="#78350f"
      strokeWidth="1.4"
    />
    <circle
      cx="15.5"
      cy="14.8"
      r="8.5"
      fill="#f59e0b"
      stroke="#fde68a"
      strokeWidth="1.2"
    />
    <path
      d="M 15.5 8.5 L 17.6 12.8 L 22 14.8 L 17.6 16.8 L 15.5 21.1 L 13.4 16.8 L 9 14.8 L 13.4 12.8 Z"
      fill="#fef08a"
      stroke="#92400e"
      strokeWidth="0.9"
      strokeLinejoin="round"
    />
    <path
      d="M 8.5 9.5 A 9.5 9.5 0 0 1 21 7.5"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.75"
    />
  </svg>
));

export const HudQuestScrollIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-6 h-6',
}) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <ellipse cx="18" cy="32" rx="12" ry="3" fill="rgba(0,0,0,0.45)" />
    <rect
      x="5"
      y="5"
      width="26"
      height="5"
      rx="2.5"
      fill="#b45309"
      stroke="#451a03"
      strokeWidth="1.5"
    />
    <circle cx="6.5" cy="7.5" r="2.5" fill="#fbbf24" stroke="#451a03" strokeWidth="1.2" />
    <circle cx="29.5" cy="7.5" r="2.5" fill="#fbbf24" stroke="#451a03" strokeWidth="1.2" />
    <path
      d="M 8 9 L 28 9 L 27 26 L 9 26 Z"
      fill="#fef3c7"
      stroke="#78350f"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M 23 9.8 L 27.2 9.8 L 26.3 25.2 L 23 25.2 Z" fill="#fde68a" />
    <path
      d="M 11.5 14.5 L 13.5 16.5 L 16.8 12.8"
      fill="none"
      stroke="#15803d"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="19"
      y1="14.8"
      x2="24.5"
      y2="14.8"
      stroke="#92400e"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="19.5"
      x2="24"
      y2="19.5"
      stroke="#b45309"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <rect
      x="6"
      y="24.5"
      width="24"
      height="5"
      rx="2.5"
      fill="#92400e"
      stroke="#451a03"
      strokeWidth="1.5"
    />
    <circle
      cx="22"
      cy="25.5"
      r="4"
      fill="#e11d48"
      stroke="#4c0519"
      strokeWidth="1.3"
    />
    <circle cx="21.5" cy="25" r="1.5" fill="#fda4af" />
  </svg>
));

export const HudShopIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-6 h-6',
}) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <ellipse cx="18" cy="32" rx="13" ry="3" fill="rgba(0,0,0,0.45)" />
    <rect
      x="7"
      y="15"
      width="22"
      height="14"
      rx="2"
      fill="#fde68a"
      stroke="#451a03"
      strokeWidth="1.6"
    />
    <rect x="21" y="15.8" width="7.2" height="12.5" fill="#f59e0b" />
    <rect
      x="5.5"
      y="22.5"
      width="25"
      height="6.5"
      rx="2"
      fill="#b45309"
      stroke="#451a03"
      strokeWidth="1.5"
    />
    <circle cx="14" cy="19.5" r="3" fill="#10b981" stroke="#064e3b" strokeWidth="1.1" />
    <circle cx="21.5" cy="20" r="2.6" fill="#fbbf24" stroke="#78350f" strokeWidth="1.1" />
    <path
      d="M 4.5 15 L 8.5 6.5 L 27.5 6.5 L 31.5 15 Z"
      fill="#10b981"
      stroke="#064e3b"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <polygon points="11.5,7.2 15.5,7.2 14.5,14.5 9.5,14.5" fill="#fef3c7" />
    <polygon points="20.5,7.2 24.5,7.2 26.5,14.5 21.5,14.5" fill="#fde047" />
    <path
      d="M 5 15 Q 8.2 18.2 11.5 15 Q 14.8 18.2 18 15 Q 21.2 18.2 24.5 15 Q 27.8 18.2 31 15"
      fill="#059669"
      stroke="#064e3b"
      strokeWidth="1.4"
    />
  </svg>
));

export const HudMailboxIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <ellipse cx="16" cy="28" rx="11" ry="2.5" fill="rgba(0,0,0,0.4)" />
    <rect
      x="4"
      y="8"
      width="24"
      height="17"
      rx="3"
      fill="#e0f2fe"
      stroke="#0c4a6e"
      strokeWidth="1.7"
    />
    <polygon points="5,24 16,16 27,24" fill="#bae6fd" />
    <polygon
      points="4.5,9 16,18.5 27.5,9"
      fill="#7dd3fc"
      stroke="#0c4a6e"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle
      cx="16"
      cy="17"
      r="3.8"
      fill="#fbbf24"
      stroke="#78350f"
      strokeWidth="1.3"
    />
    <circle cx="15.3" cy="16.3" r="1.2" fill="#fef9c3" />
  </svg>
));

export const HudGardenNavIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-6 h-6',
}) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <polygon
      points="18,22 31,27.5 18,33 5,27.5"
      fill="#15803d"
      stroke="#052e16"
      strokeWidth="1.5"
    />
    <polygon points="5,27.5 18,33 18,35 5,29.5" fill="#78350f" />
    <polygon points="31,27.5 18,33 18,35 31,29.5" fill="#451a03" />
    <path
      d="M 15.5 27.5 L 16.5 18 L 19.5 18 L 20.5 27.5 Z"
      fill="#92400e"
      stroke="#451a03"
      strokeWidth="1.3"
    />
    <circle
      cx="12.5"
      cy="16.5"
      r="6"
      fill="#10b981"
      stroke="#064e3b"
      strokeWidth="1.4"
    />
    <circle
      cx="23.5"
      cy="16.5"
      r="6"
      fill="#059669"
      stroke="#064e3b"
      strokeWidth="1.4"
    />
    <circle
      cx="18"
      cy="11.5"
      r="7.2"
      fill="#34d399"
      stroke="#064e3b"
      strokeWidth="1.5"
    />
    <circle cx="15.5" cy="9.5" r="3" fill="#a7f3d0" opacity="0.8" />
    <circle cx="21" cy="13.5" r="1.6" fill="#fde047" />
    <circle cx="13.5" cy="16" r="1.5" fill="#fde047" />
  </svg>
));

export const HudGlobeOrbIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-7 h-7',
}) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <circle
      cx="20"
      cy="20"
      r="15"
      fill="#0284c7"
      stroke="#082f49"
      strokeWidth="2"
    />
    <circle cx="16.5" cy="16.5" r="12" fill="#0ea5e9" />
    <path
      d="M 11 14 C 14 11 19 11.5 21 15 C 23 18.5 18 22 15 24 C 12 26 9 21 11 14 Z"
      fill="#10b981"
      stroke="#065f46"
      strokeWidth="1.2"
    />
    <path
      d="M 24 13 C 27 14 31 18 29 23 C 27 28 22 27 23 22 C 24 18 22 15 24 13 Z"
      fill="#059669"
      stroke="#065f46"
      strokeWidth="1.2"
    />
    <path
      d="M 11 11 A 11 11 0 0 1 25 8.5"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.75"
    />
    <ellipse
      cx="20"
      cy="20"
      rx="17.5"
      ry="6"
      transform="rotate(-18 20 20)"
      fill="none"
      stroke="#fbbf24"
      strokeWidth="2"
    />
  </svg>
));

export const HudLayoutCrateIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <ellipse cx="16" cy="28.5" rx="11" ry="2.5" fill="rgba(0,0,0,0.4)" />
    <polygon
      points="16,6 28,12 16,18 4,12"
      fill="#34d399"
      stroke="#064e3b"
      strokeWidth="1.5"
    />
    <polygon
      points="4,12 16,18 16,26.5 4,20.5"
      fill="#d97706"
      stroke="#451a03"
      strokeWidth="1.5"
    />
    <polygon
      points="28,12 16,18 16,26.5 28,20.5"
      fill="#92400e"
      stroke="#451a03"
      strokeWidth="1.5"
    />
    <path
      d="M 16 8.5 L 16 15.5 M 11.5 12 L 20.5 12"
      stroke="#fef08a"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
));

export const HudChatIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <ellipse cx="16" cy="28.5" rx="10" ry="2.4" fill="rgba(0,0,0,0.4)" />
    <path
      d="M 11 7 C 11 5.3 12.3 4 14 4 L 25 4 C 26.7 4 28 5.3 28 7 L 28 15 C 28 16.7 26.7 18 25 18 L 23 18 L 24.5 21.5 L 19.5 18 L 14 18 C 12.3 18 11 16.7 11 15 Z"
      fill="#34d399"
      stroke="#064e3b"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M 4 11 C 4 9.1 5.5 7.5 7.5 7.5 L 19.5 7.5 C 21.4 7.5 23 9.1 23 11 L 23 19.5 C 23 21.4 21.4 23 19.5 23 L 11.5 23 L 7 26.8 L 8 23 L 7.5 23 C 5.5 23 4 21.4 4 19.5 Z"
      fill="#fef3c7"
      stroke="#78350f"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="9.8" cy="15.3" r="1.5" fill="#b45309" />
    <circle cx="13.5" cy="15.3" r="1.5" fill="#d97706" />
    <circle cx="17.2" cy="15.3" r="1.5" fill="#b45309" />
  </svg>
));

export const HudGroupTentIcon: React.FC<{ className?: string }> = React.memo(({
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <ellipse cx="16" cy="28" rx="12" ry="2.6" fill="rgba(0,0,0,0.4)" />
    <line x1="16" y1="3.5" x2="16" y2="9.5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
    <polygon points="16,4 24,6.2 16,8.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.9" />
    <polygon points="16,8 4.5,24.5 16,27.5" fill="#fde68a" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="round" />
    <polygon points="16,8 27.5,24.5 16,27.5" fill="#d97706" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="round" />
    <polygon points="16,8 9.5,25.5 16,27.5" fill="#10b981" opacity="0.85" />
    <polygon points="16,16 12,26.5 20,26.5" fill="#451a03" />
  </svg>
));
