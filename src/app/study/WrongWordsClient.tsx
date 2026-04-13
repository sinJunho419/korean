'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Idiom, WrongIdiomEntry } from '@/types/idiom'
import { BookX, Swords, RotateCcw, CheckCircle2, XCircle, ArrowLeft, GraduationCap, List, AlertTriangle } from 'lucide-react'
import confetti from 'canvas-confetti'
import QuizTimerBar from './QuizTimerBar'
import styles from './study.module.css'

interface RevengeQuestion {
    entry: WrongIdiomEntry
    options: string[]
    correct: string
}

type Mode = 'list' | 'revenge'
type QuizState = 'playing' | 'wrong' | 'finished'
type ListFilter = 'all' | 'danger' | 'near_grad' | 'graduated'

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

interface Props {
    onExit: () => void
}

export default function WrongWordsClient({ onExit }: Props) {
    const supabase = createClient()
    const [userId, setUserId] = useState<number | null>(null)
    const [isLocalUser, setIsLocalUser] = useState(false)
    const [wrongWords, setWrongWords] = useState<WrongIdiomEntry[]>([])
    const [masteredWords, setMasteredWords] = useState<WrongIdiomEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [mode, setMode] = useState<Mode>('list')
    const [listFilter, setListFilter] = useState<ListFilter>('all')

    // Revenge quiz state
    const [quiz, setQuiz] = useState<RevengeQuestion[]>([])
    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [score, setScore] = useState(0)
    const [graduated, setGraduated] = useState<string[]>([])
    const [timerReset, setTimerReset] = useState(0)
    const [quizState, setQuizState] = useState<QuizState>('playing')
    const [consecutiveMap, setConsecutiveMap] = useState<Record<number, number>>({})

    const prevIndexRef = useRef(-1)

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const loginInfoId = user.user_metadata?.login_info_id as number
                setUserId(loginInfoId)
                await fetchWrongWords(loginInfoId)
            } else {
                setIsLocalUser(true)
                await fetchLocalWrongWords()
            }
        }
        init()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchLocalWrongWords() {
        setIsLoading(true)
        try {
            const stored: Record<string, { wrong_count: number; consecutive_correct: number; status: string; last_wrong_at: string }> =
                JSON.parse(localStorage.getItem('local_korean_wrong') || '{}')
            const entries = Object.entries(stored)
            if (entries.length === 0) {
                setWrongWords([]); setMasteredWords([]); setIsLoading(false); return
            }

            const idiomIds = entries.map(([id]) => Number(id))
            const { data: idiomsData } = await supabase.from('korean_idioms').select('*').in('id', idiomIds)
            const idiomMap = new Map((idiomsData || []).map(w => [w.id, w as Idiom]))

            const learning: WrongIdiomEntry[] = []
            const mastered: WrongIdiomEntry[] = []
            for (const [idStr, info] of entries) {
                const wid = Number(idStr)
                const w = idiomMap.get(wid)
                if (!w) continue
                const entry: WrongIdiomEntry = {
                    id: wid, idiom_id: wid,
                    wrong_count: info.wrong_count,
                    consecutive_correct: info.consecutive_correct,
                    status: info.status,
                    last_wrong_at: info.last_wrong_at,
                    idiom: w,
                }
                if (info.status === 'Mastered') mastered.push(entry)
                else learning.push(entry)
            }
            learning.sort((a, b) => b.wrong_count - a.wrong_count)
            setWrongWords(learning)
            setMasteredWords(mastered)

            const cMap: Record<number, number> = {}
            learning.forEach(e => { cMap[e.idiom_id] = e.consecutive_correct })
            setConsecutiveMap(cMap)
        } catch { setWrongWords([]); setMasteredWords([]) }
        setIsLoading(false)
    }

    function saveLocalWrongWord(idiomId: number, correct: boolean) {
        try {
            const stored: Record<string, { wrong_count: number; consecutive_correct: number; status: string; last_wrong_at: string }> =
                JSON.parse(localStorage.getItem('local_korean_wrong') || '{}')
            const key = String(idiomId)
            const entry = stored[key] || { wrong_count: 0, consecutive_correct: 0, status: 'Learning', last_wrong_at: '' }
            if (correct) {
                entry.consecutive_correct += 1
                if (entry.consecutive_correct >= 3) entry.status = 'Mastered'
            } else {
                entry.consecutive_correct = 0
            }
            entry.last_wrong_at = new Date().toISOString()
            stored[key] = entry
            localStorage.setItem('local_korean_wrong', JSON.stringify(stored))
            return entry.status
        } catch { return 'Learning' }
    }

    async function fetchWrongWords(uid: number) {
        setIsLoading(true)

        const { data } = await supabase
            .from('korean_wrong_answers')
            .select('id, idiom_id, wrong_count, consecutive_correct, status, last_wrong_at')
            .eq('user_id', uid)
            .eq('status', 'Learning')
            .order('wrong_count', { ascending: false })

        const { data: masteredData } = await supabase
            .from('korean_wrong_answers')
            .select('id, idiom_id, wrong_count, consecutive_correct, status, last_wrong_at')
            .eq('user_id', uid)
            .eq('status', 'Mastered')
            .order('last_wrong_at', { ascending: false })

        const allData = [...(data || []), ...(masteredData || [])]

        if (allData.length === 0) {
            setWrongWords([]); setMasteredWords([]); setIsLoading(false); return
        }

        const idiomIds = allData.map(d => d.idiom_id)
        const { data: idiomsData } = await supabase
            .from('korean_idioms')
            .select('*')
            .in('id', idiomIds)

        const idiomMap = new Map((idiomsData || []).map(w => [w.id, w as Idiom]))

        const learningEntries: WrongIdiomEntry[] = (data || [])
            .filter(d => idiomMap.has(d.idiom_id))
            .map(d => ({ ...d, idiom: idiomMap.get(d.idiom_id)! }))

        const masteredEntries: WrongIdiomEntry[] = (masteredData || [])
            .filter(d => idiomMap.has(d.idiom_id))
            .map(d => ({ ...d, idiom: idiomMap.get(d.idiom_id)! }))

        setWrongWords(learningEntries)
        setMasteredWords(masteredEntries)

        const cMap: Record<number, number> = {}
        learningEntries.forEach(e => { cMap[e.idiom_id] = e.consecutive_correct })
        setConsecutiveMap(cMap)
        setIsLoading(false)
    }

    async function startRevengeQuiz() {
        if (wrongWords.length < 4) return

        const { data: randomIdioms } = await supabase
            .from('korean_idioms')
            .select('meaning')
            .limit(50)

        const allMeanings = Array.from(new Set((randomIdioms || []).map(w => w.meaning)))

        const shuffled = [...wrongWords].sort(() => Math.random() - 0.5)

        const questions: RevengeQuestion[] = shuffled.map(entry => {
            const correct = entry.idiom.meaning
            let wrongs = allMeanings
                .filter(m => m !== correct)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
            while (wrongs.length < 3) wrongs.push('(없음)')
            const options = [correct, ...wrongs].sort(() => Math.random() - 0.5)
            return { entry, options, correct }
        })

        setQuiz(questions)
        setIndex(0); setScore(0)
        setSelected(null); setGraduated([])
        setQuizState('playing'); setTimerReset(t => t + 1)
        prevIndexRef.current = -1
        setMode('revenge')
    }

    function handleTimeout() {
        if (selected !== null || quizState !== 'playing') return
        handleSelect('__timeout__')
    }

    async function handleSelect(option: string) {
        if (selected !== null || (!userId && !isLocalUser)) return
        setSelected(option)

        const current = quiz[index]
        const isLocal = isLocalUser

        if (option === current.correct) {
            setScore(s => s + 1)

            let status: string | null = null
            if (isLocal) {
                status = saveLocalWrongWord(current.entry.idiom_id, true)
            } else {
                const { data } = await supabase.rpc('record_korean_revenge_correct', {
                    p_user_id: userId,
                    p_idiom_id: current.entry.idiom_id,
                })
                status = data
            }

            const newCount = (consecutiveMap[current.entry.idiom_id] || 0) + 1
            setConsecutiveMap(prev => ({ ...prev, [current.entry.idiom_id]: newCount }))

            if (status === 'Mastered') {
                setGraduated(prev => [...prev, current.entry.idiom.idiom])
                confetti({
                    particleCount: 80,
                    spread: 60,
                    origin: { y: 0.7 },
                    colors: ['#4CAF50', '#66BB6A', '#81C784', '#A5D6A7'],
                })
            }

            setTimeout(() => {
                if (index + 1 >= quiz.length) setQuizState('finished')
                else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setTimerReset(t => t + 1) }
            }, status === 'Mastered' ? 1200 : 800)
        } else {
            if (option !== '__timeout__') {
                if (isLocal) {
                    saveLocalWrongWord(current.entry.idiom_id, false)
                } else {
                    await supabase.rpc('record_korean_revenge_wrong', {
                        p_user_id: userId,
                        p_idiom_id: current.entry.idiom_id,
                    })
                }
                setConsecutiveMap(prev => ({ ...prev, [current.entry.idiom_id]: 0 }))
            }
            setQuizState('wrong')
        }
    }

    // 오답 후 1.5초 자동 넘기기
    useEffect(() => {
        if (quizState !== 'wrong') return
        const timer = setTimeout(() => {
            if (index + 1 >= quiz.length) setQuizState('finished')
            else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setTimerReset(t => t + 1) }
        }, 1500)
        return () => clearTimeout(timer)
    }, [quizState, index, quiz.length])

    function backToList() {
        setMode('list')
        if (isLocalUser) fetchLocalWrongWords()
        else if (userId) fetchWrongWords(userId)
    }

    // ── 로딩 ──
    if (isLoading) {
        return (
            <motion.div className={`${styles.glass} ${styles.empty}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                로딩 중…
            </motion.div>
        )
    }

    if (!userId && !isLocalUser) {
        return (
            <motion.div className={`${styles.glass} ${styles.empty}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                로그인이 필요합니다.
            </motion.div>
        )
    }

    // ── 결과 화면 ──
    if (mode === 'revenge' && quizState === 'finished') {
        const pct = quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0
        return (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                <div className={`${styles.glass} ${styles.quizResult}`}>
                    <div className={styles.resultEmoji}>{pct === 100 ? '🏆' : pct >= 70 ? '👍' : '💪'}</div>
                    <h2 className={styles.resultTitle}>리벤지 퀴즈 완료!</h2>
                    <p className={styles.resultScore}>
                        <span className={styles.resultCorrect}>{score}</span>
                        <span className={styles.resultTotal}> / {quiz.length}</span>
                    </p>
                    <p className={styles.resultPct}>{pct}% 정답</p>

                    {graduated.length > 0 && (
                        <div className={styles.graduatedBox}>
                            <p className={styles.graduatedTitle}>
                                <CheckCircle2 size={18} style={{ verticalAlign: '-3px' }} /> 졸업 ({graduated.length}개)
                            </p>
                            <div className={styles.graduatedList}>
                                {graduated.map(w => (
                                    <span key={w} className={styles.graduatedWord}>{w}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <motion.button className={styles.retryBtn} onClick={startRevengeQuiz}
                            whileTap={{ scale: 0.93 }} transition={spring}>
                            <RotateCcw size={16} style={{ verticalAlign: '-3px', marginRight: '4px' }} />
                            다시 풀기
                        </motion.button>
                        <motion.button className={styles.retryBtn} onClick={backToList}
                            whileTap={{ scale: 0.93 }} transition={spring}
                            style={{ background: 'linear-gradient(135deg, #64748b, #94a3b8)' }}>
                            <ArrowLeft size={16} style={{ verticalAlign: '-3px', marginRight: '4px' }} />
                            목록으로
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        )
    }

    // ── 리벤지 퀴즈 진행 ──
    if (mode === 'revenge') {
        const current = quiz[index]
        if (!current) return null

        const progress = (index / quiz.length) * 100
        const currentConsecutive = consecutiveMap[current.entry.idiom_id] || 0

        return (
            <div className={styles.quiz}>
                <div className={`${styles.glass} ${styles.progressRow}`}>
                    <div className={styles.progressBar}>
                        <motion.div className={styles.progressFill}
                            animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                    </div>
                    <span className={styles.progressText}>{index + 1} / {quiz.length}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className={styles.typeBadge}>리벤지 · 6초</span>
                </div>

                <QuizTimerBar onTimeout={handleTimeout} resetTrigger={timerReset}
                    stopped={selected !== null} totalTimeSec={6} />

                {/* 연속 정답 게이지 */}
                <div className={styles.consecutiveRow}>
                    <div className={styles.consecutiveDots}>
                        {[0, 1, 2].map(i => (
                            <span key={i}
                                className={i < currentConsecutive ? styles.dotFilled : styles.dotEmpty}
                            />
                        ))}
                    </div>
                    <span className={styles.consecutiveLabel}>
                        {currentConsecutive}/3 연속 정답
                        {currentConsecutive >= 3 && ' ✓ 졸업!'}
                    </span>
                    <span className={styles.wrongCount}>
                        <XCircle size={12} /> {current.entry.wrong_count}회 틀림
                    </span>
                </div>

                {/* 졸업 토스트 */}
                <AnimatePresence>
                    {selected === current.correct && (consecutiveMap[current.entry.idiom_id] || 0) >= 3 && (
                        <motion.div className={styles.graduationToast}
                            initial={{ opacity: 0, scale: 0.8, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={spring}>
                            <GraduationCap size={20} />
                            <span>&ldquo;{current.entry.idiom.idiom}&rdquo; 졸업!</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 문제: 사자성어 → 뜻 선택 */}
                <AnimatePresence mode="wait">
                    <motion.div key={index}
                        className={`${styles.glass} ${styles.quizQuestion}`}
                        initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }} transition={spring}>
                        <ruby className={styles.rubyText} style={{ fontSize: '1.8rem' }}>
                            {current.entry.idiom.idiom}
                            <rt>{current.entry.idiom.hanja || ''}</rt>
                        </ruby>
                    </motion.div>
                </AnimatePresence>

                {/* 선택지 */}
                <div className={styles.quizOptions}>
                    {current.options.map((opt, i) => {
                        let cls = styles.quizOption
                        if (selected !== null) {
                            if (opt === current.correct) cls = `${styles.quizOption} ${styles.optCorrect}`
                            else if (opt === selected && selected !== '__timeout__') cls = `${styles.quizOption} ${styles.optWrong}`
                            else cls = `${styles.quizOption} ${styles.optDim}`
                        }
                        return (
                            <motion.button key={i} className={cls}
                                onClick={() => handleSelect(opt)}
                                disabled={selected !== null}
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ ...spring, delay: i * 0.06 }}
                                whileTap={selected === null ? { scale: 0.94 } : {}}>
                                {opt}
                            </motion.button>
                        )
                    })}
                </div>

                {/* 오답 피드백 */}
                <AnimatePresence>
                    {quizState === 'wrong' && (
                        <motion.div className={`${styles.glass} ${styles.wrongFeedback}`}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            transition={spring}>
                            <p>
                                {selected === '__timeout__' ? '⏰ 시간 초과! ' : ''}
                                정답: <strong>{current.correct}</strong>
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    // ── 목록 화면 ──
    if (wrongWords.length === 0 && masteredWords.length === 0) {
        return (
            <motion.div className={`${styles.glass} ${styles.empty}`}
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <BookX size={48} style={{ color: '#94a3b8' }} />
                <p style={{ margin: 0 }}>틀린 사자성어가 없습니다!</p>
                <small style={{ fontSize: '0.8rem', opacity: 0.6 }}>퀴즈에서 틀린 사자성어가 여기에 표시됩니다.</small>
            </motion.div>
        )
    }

    // 상태 필터링
    const isGraduatedView = listFilter === 'graduated'
    const filteredWords = isGraduatedView
        ? masteredWords
        : wrongWords.filter(entry => {
            if (listFilter === 'danger') return entry.wrong_count >= 3
            if (listFilter === 'near_grad') return entry.consecutive_correct >= 2
            return true
        })

    const dangerCount = wrongWords.filter(e => e.wrong_count >= 3).length
    const nearGradCount = wrongWords.filter(e => e.consecutive_correct >= 2).length
    const maxWrongCount = Math.max(...wrongWords.map(e => e.wrong_count), 1)

    return (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* 헤더 */}
            <div className={`${styles.glass}`} style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                            <BookX size={18} style={{ verticalAlign: '-3px', marginRight: '6px', color: '#ef4444' }} />
                            오답 {wrongWords.length}개
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', margin: '2px 0 0' }}>
                            3회 연속 정답 시 졸업
                        </p>
                    </div>
                </div>

                <div className={styles.wrongActionsRow}>
                    <motion.button className={styles.revengeBtn} onClick={startRevengeQuiz}
                        whileTap={{ scale: 0.93 }} transition={spring}
                        disabled={wrongWords.length < 4}>
                        <Swords size={16} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                        리벤지 퀴즈
                    </motion.button>
                </div>
            </div>

            {wrongWords.length < 4 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', textAlign: 'center', padding: '0 1rem' }}>
                    오답이 4개 이상일 때 리벤지 퀴즈를 시작할 수 있습니다.
                </p>
            )}

            {/* 상태 필터 탭 */}
            <div className={`${styles.glass} ${styles.filterRow}`}>
                {([
                    { key: 'all' as ListFilter, label: '전체', icon: <List size={14} />, count: wrongWords.length },
                    { key: 'danger' as ListFilter, label: '위험', icon: <AlertTriangle size={14} />, count: dangerCount },
                    { key: 'near_grad' as ListFilter, label: '졸업임박', icon: <GraduationCap size={14} />, count: nearGradCount },
                    { key: 'graduated' as ListFilter, label: '졸업', icon: <CheckCircle2 size={14} />, count: masteredWords.length },
                ]).map(f => (
                    <motion.button
                        key={f.key}
                        className={`${styles.filterBtn} ${listFilter === f.key ? styles.filterActive : ''} ${f.key === 'danger' && listFilter === f.key ? styles.filterDanger : ''} ${f.key === 'near_grad' && listFilter === f.key ? styles.filterGrad : ''} ${f.key === 'graduated' && listFilter === f.key ? styles.filterGraduated : ''}`}
                        onClick={() => setListFilter(f.key)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {f.icon}
                        <span>{f.label}</span>
                        <span className={styles.filterCount}>{f.count}</span>
                    </motion.button>
                ))}
            </div>

            {/* 오답 목록 */}
            <div className={styles.wrongWordsList}>
                <AnimatePresence mode="popLayout">
                    {filteredWords.length === 0 ? (
                        <motion.div key="empty-filter"
                            className={`${styles.glass} ${styles.empty}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ padding: '2rem' }}>
                            {listFilter === 'danger' ? '위험 사자성어가 없습니다.'
                                : listFilter === 'graduated' ? '졸업한 사자성어가 없습니다.'
                                : '졸업 임박 사자성어가 없습니다.'}
                        </motion.div>
                    ) : isGraduatedView ? (
                        filteredWords.map((entry, i) => (
                            <motion.div key={entry.id}
                                className={`${styles.glass} ${styles.wrongWordCard}`}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)',
                                    borderColor: 'rgba(16,185,129,0.25)',
                                }}>
                                <div className={styles.wrongWordMain}>
                                    <span className={styles.wrongWordText}>{entry.idiom.idiom}</span>
                                    <span className={styles.wrongWordMeaning}>{entry.idiom.meaning}</span>
                                </div>
                                <div className={styles.wrongWordMeta}>
                                    <span className={styles.masteredBadge}>
                                        <CheckCircle2 size={12} /> 졸업
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        filteredWords.map((entry, i) => {
                            const heatIntensity = Math.min(entry.wrong_count / maxWrongCount, 1)
                            const heatAlpha = 0.03 + heatIntensity * 0.12
                            return (
                                <motion.div key={entry.id}
                                    className={`${styles.glass} ${styles.wrongWordCard}`}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                                    style={{
                                        background: `linear-gradient(135deg, rgba(239,68,68,${heatAlpha}) 0%, rgba(239,68,68,${heatAlpha * 0.4}) 100%)`,
                                        borderColor: `rgba(239,68,68,${0.08 + heatIntensity * 0.2})`,
                                    }}>
                                    <div className={styles.wrongWordMain}>
                                        <span className={styles.wrongWordText}>{entry.idiom.idiom}</span>
                                        <span className={styles.wrongWordMeaning}>{entry.idiom.meaning}</span>
                                    </div>
                                    <div className={styles.wrongWordMeta}>
                                        <span className={styles.wrongCountBadge}
                                            style={{
                                                background: `rgba(239,68,68,${0.06 + heatIntensity * 0.14})`,
                                                color: heatIntensity > 0.6 ? '#b91c1c' : '#ef4444',
                                            }}>
                                            <XCircle size={12} /> {entry.wrong_count}회
                                        </span>
                                        <div className={styles.consecutiveDots}>
                                            {[0, 1, 2].map(j => (
                                                <span key={j}
                                                    className={j < entry.consecutive_correct ? styles.dotFilled : styles.dotEmpty}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
