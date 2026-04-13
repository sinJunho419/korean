import type { Level } from '@/types/idiom'

export interface TierInfo {
    label: string
    labelKo: string
    color: string
    bg: string
}

const TIER_MAP: Record<Level, TierInfo> = {
    beginner:     { label: '초급', labelKo: '초급', color: '#81C784', bg: 'rgba(129,199,132,0.15)' },
    intermediate: { label: '중급', labelKo: '중급', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    advanced:     { label: '고급', labelKo: '고급', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
}

export function getTierInfo(level: Level): TierInfo {
    return TIER_MAP[level]
}

export function getTierColor(level: Level): string {
    return TIER_MAP[level].color
}

export const TIER_LEVELS: { value: Level; label: string }[] = [
    { value: 'beginner',     label: '초급 (일상/기초)' },
    { value: 'intermediate', label: '중급 (교과서/내신)' },
    { value: 'advanced',     label: '고급 (수능/모의고사)' },
]
