'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Idiom, Level } from '@/types/idiom'
import { TIER_LEVELS } from '@/lib/tierSystem'
import styles from './study.module.css'
import MeaningQuizClient from './MeaningQuizClient'
import ArrangeQuizClient from './ArrangeQuizClient'
import WrongWordsClient from './WrongWordsClient'

type Tab = 'study' | 'meaning' | 'arrange' | 'wrong'

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }
const fadeUp = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } }

export default function StudyClient() {
    const supabase = createClient()

    const [tab, setTab] = useState<Tab>('study')
    const [level, setLevel] = useState<Level | null>(null)
    const [setNo, setSetNo] = useState<number | null>(null)
    const [availableSets, setAvailableSets] = useState<number[]>([])
    const [idioms, setIdioms] = useState<Idiom[]>([])
    const isReady = level !== null && setNo !== null

    const [successCount, setSuccessCount] = useState(0)
    const [medalCount, setMedalCount] = useState(0)

    const progressKey = level && setNo !== null ? `korean_progress_${level}_${setNo}` : null

    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const studyLoggedRef = useRef(false)
    const [isPending, startTransition] = useTransition()

    // 성공/메달 로드
    useEffect(() => {
        if (!progressKey) return
        try {
            const saved = JSON.parse(localStorage.getItem(progressKey) || '{}')
            setSuccessCount(saved.success ?? 0)
            setMedalCount(saved.medal ?? 0)
        } catch { setSuccessCount(0); setMedalCount(0) }
    }, [progressKey])

    function saveProgress(success: number, medal: number) {
        if (!progressKey) return
        localStorage.setItem(progressKey, JSON.stringify({ success, medal }))
    }

    function handleQuizFinish(score: number, total: number) {
        const pct = Math.round((score / total) * 100)
        if (pct >= 90) {
            const next = Math.min(successCount + 1, 3)
            setSuccessCount(next)
            saveProgress(next, medalCount)
        }
    }

    // 레벨 변경
    async function changeLevel(newLevel: Level | null) {
        if (!newLevel) return
        setLevel(newLevel)
        setSetNo(null)
        setIdioms([])
        startTransition(async () => {
            const { data } = await supabase
                .from('korean_idioms')
                .select('set_no')
                .eq('level', newLevel)
                .order('set_no', { ascending: true })

            if (!data || data.length === 0) {
                setAvailableSets([])
                return
            }

            const sets = [...new Set(data.map(d => d.set_no))]
            setAvailableSets(sets)
        })
    }

    // 세트 변경
    const changeSet = useCallback(async (newSetNo: number) => {
        if (!level) return
        setSetNo(newSetNo)
        startTransition(async () => {
            const { data } = await supabase
                .from('korean_idioms')
                .select('*')
                .eq('level', level)
                .eq('set_no', newSetNo)
                .order('id')
            setIdioms((data ?? []) as Idiom[])
            setCurrentIndex(0)
            setIsFlipped(false)
            studyLoggedRef.current = false
        })
    }, [level]) // eslint-disable-line react-hooks/exhaustive-deps

    // 학습 완료 기록
    useEffect(() => {
        if (!level || setNo === null || idioms.length === 0) return
        if (currentIndex !== idioms.length - 1) return
        if (studyLoggedRef.current) return
        studyLoggedRef.current = true
        ;(async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const loginInfoId = user.user_metadata?.login_info_id
            if (!loginInfoId) return
            await supabase.from('korean_activity_log').insert({
                user_id: loginInfoId,
                activity_type: 'study_complete',
                level,
                set_no: setNo,
                total: idioms.length,
            })
        })()
    }, [currentIndex, idioms.length, level, setNo]) // eslint-disable-line react-hooks/exhaustive-deps

    const current = idioms[currentIndex]
    const progress = idioms.length > 0 ? ((currentIndex + 1) / idioms.length) * 100 : 0

    return (
        <div className={styles.page}>
            <div className={styles.bento}>

                {/* 컨트롤 영역 */}
                <motion.div
                    className={`${styles.glass} ${styles.controlsWrap}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.08 } as Transition}
                >
                    {/* 레벨 & 세트 선택 */}
                    <div className={styles.selectRow}>
                        <select value={level ?? ''} onChange={e => changeLevel((e.target.value || null) as Level | null)} disabled={isPending}>
                            <option value="" disabled>난이도 선택</option>
                            {TIER_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                        <select
                            value={setNo ?? ''}
                            onChange={e => changeSet(Number(e.target.value))}
                            disabled={isPending || !level}
                        >
                            <option value="" disabled>Set 선택</option>
                            {availableSets.map(s => (
                                <option key={s} value={s}>Set {s}</option>
                            ))}
                        </select>
                    </div>

                    {/* 성공 횟수 & 메달 */}
                    {isReady && (
                        <div className={styles.progressStatus}>
                            <div className={styles.successDots}>
                                <span className={styles.statusLabel}>테스트</span>
                                {[0, 1, 2].map(i => (
                                    <span key={i} className={`${styles.dot} ${i < successCount ? styles.dotFilledGreen : ''}`} />
                                ))}
                                <span className={styles.successText}>{successCount}/3</span>
                            </div>
                            {medalCount > 0 && (
                                <div className={styles.medalDisplay}>
                                    <span className={styles.medalIcon}>🏅</span>
                                    <span className={styles.medalCount}>{medalCount}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 탭 */}
                    {isReady ? (
                        <div className={styles.tabs}>
                            {([
                                { key: 'study' as Tab, label: '학습' },
                                { key: 'meaning' as Tab, label: '의미 퀴즈' },
                                { key: 'arrange' as Tab, label: '배열 퀴즈' },
                                { key: 'wrong' as Tab, label: '오답노트' },
                            ]).map(t => (
                                <motion.button
                                    key={t.key}
                                    className={`${styles.tabBtn} ${tab === t.key ? styles.tabActive : ''}`}
                                    onClick={() => setTab(t.key)}
                                    disabled={t.key !== 'wrong' && idioms.length === 0}
                                    whileTap={{ scale: 0.93 }}
                                    transition={spring}
                                >
                                    {t.label}
                                </motion.button>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.selectHint}>
                            {!level ? '난이도와 세트를 선택하세요' : '세트를 선택하세요'}
                        </p>
                    )}
                </motion.div>

                {/* 탭 콘텐츠 */}
                {isReady && <AnimatePresence mode="wait">
                    {tab === 'study' ? (
                        isPending ? (
                            <motion.div key="loading" {...fadeUp} className={`${styles.glass} ${styles.empty}`}>
                                로딩 중…
                            </motion.div>
                        ) : idioms.length === 0 ? (
                            <motion.div key="empty" {...fadeUp} className={`${styles.glass} ${styles.empty}`}>
                                데이터가 없습니다.<br />
                                <small style={{ fontSize: '0.8rem', opacity: 0.6 }}>Supabase에서 create_tables.sql을 실행해주세요.</small>
                            </motion.div>
                        ) : (
                            <motion.div key="study-content" {...fadeUp} transition={{ ...spring, delay: 0.05 } as Transition}>
                                {/* 진행 바 */}
                                <div className={`${styles.glass} ${styles.progressRow}`}>
                                    <div className={styles.progressBar}>
                                        <motion.div
                                            className={styles.progressFill}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.4 }}
                                        />
                                    </div>
                                    <span className={styles.progressText}>{currentIndex + 1} / {idioms.length}</span>
                                </div>

                                {/* 플래시카드 */}
                                <motion.div
                                    key={currentIndex}
                                    className={styles.cardWrap}
                                    initial={{ opacity: 0, scale: 0.92 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={spring}
                                    style={{ margin: '0.5rem 0' }}
                                >
                                    <div
                                        className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
                                        onClick={() => setIsFlipped(v => !v)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={e => e.key === 'Enter' && setIsFlipped(v => !v)}
                                    >
                                        {/* 앞면: 사자성어 + 한자 */}
                                        <div className={`${styles.cardFace} ${styles.cardFront}`}>
                                            <ruby className={styles.rubyText}>
                                                {current.idiom}
                                                <rt>{current.hanja || ''}</rt>
                                            </ruby>
                                        </div>
                                        {/* 뒷면: 뜻 + 예문 */}
                                        <div className={`${styles.cardFace} ${styles.cardBack}`}>
                                            <div className={styles.meaningText}>
                                                {current.meaning}
                                            </div>
                                            {current.example_sentence && (
                                                <p className={styles.exampleText}>
                                                    예) {current.example_sentence}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>

                                <p className={styles.hint}>
                                    {isFlipped ? '다시 클릭하면 사자성어로 돌아갑니다' : '카드를 클릭하면 뜻이 보입니다'}
                                </p>

                                {/* 이전 / 다음 */}
                                <div className={`${styles.glass} ${styles.nav}`}>
                                    <motion.button
                                        className={styles.navBtn}
                                        onClick={() => { setCurrentIndex(i => i - 1); setIsFlipped(false) }}
                                        disabled={currentIndex === 0}
                                        whileTap={{ scale: 0.93 }}
                                        transition={spring}
                                    >← 이전</motion.button>
                                    <motion.button
                                        className={styles.navBtn}
                                        onClick={() => { setCurrentIndex(i => i + 1); setIsFlipped(false) }}
                                        disabled={currentIndex === idioms.length - 1}
                                        whileTap={{ scale: 0.93 }}
                                        transition={spring}
                                    >다음 →</motion.button>
                                </div>
                            </motion.div>
                        )
                    ) : tab === 'meaning' ? (
                        idioms.length < 4 ? (
                            <motion.div key="meaning-empty" {...fadeUp} className={`${styles.glass} ${styles.empty}`}>
                                의미 퀴즈는 사자성어가 최소 4개 이상 필요합니다.
                            </motion.div>
                        ) : (
                            <motion.div key="meaning-content" {...fadeUp} transition={{ ...spring } as Transition}>
                                <MeaningQuizClient
                                    key={`meaning-${level}-${setNo}`}
                                    idioms={idioms}
                                    level={level!}
                                    setNo={setNo!}
                                    onExit={() => setTab('study')}
                                    onFinish={handleQuizFinish}
                                />
                            </motion.div>
                        )
                    ) : tab === 'arrange' ? (
                        idioms.length === 0 ? (
                            <motion.div key="arrange-empty" {...fadeUp} className={`${styles.glass} ${styles.empty}`}>
                                글자 배열 퀴즈에 사용할 데이터가 없습니다.
                            </motion.div>
                        ) : (
                            <motion.div key="arrange-content" {...fadeUp} transition={{ ...spring } as Transition}>
                                <ArrangeQuizClient
                                    key={`arrange-${level}-${setNo}`}
                                    idioms={idioms}
                                    level={level!}
                                    setNo={setNo!}
                                    onExit={() => setTab('study')}
                                    onFinish={handleQuizFinish}
                                />
                            </motion.div>
                        )
                    ) : tab === 'wrong' ? (
                        <motion.div key="wrong-content" {...fadeUp} transition={{ ...spring } as Transition}>
                            <WrongWordsClient onExit={() => setTab('study')} />
                        </motion.div>
                    ) : null}
                </AnimatePresence>}
            </div>
        </div>
    )
}
