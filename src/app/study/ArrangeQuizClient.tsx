'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Idiom } from '@/types/idiom'
import QuizTimerBar from './QuizTimerBar'
import styles from './study.module.css'

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

interface ArrangeQuestion {
    idiom: Idiom
    shuffledChars: string[]    // 셔플된 글자 배열
    correctChars: string[]     // 정답 글자 배열
}

function buildArrangeQuiz(idioms: Idiom[]): ArrangeQuestion[] {
    return shuffle(idioms.filter(i => i.idiom.length === 4)).map(idiom => {
        const chars = idiom.idiom.split('')
        let shuffled = shuffle(chars)
        // 우연히 정답 순서가 되지 않도록
        let attempts = 0
        while (shuffled.join('') === chars.join('') && attempts < 10) {
            shuffled = shuffle(chars)
            attempts++
        }
        return {
            idiom,
            shuffledChars: shuffled,
            correctChars: chars,
        }
    })
}

type QuizState = 'playing' | 'correct' | 'wrong' | 'finished'

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

interface Props {
    idioms: Idiom[]
    level: string
    setNo: number
    onExit?: () => void
    onFinish?: (score: number, total: number) => void
}

export default function ArrangeQuizClient({ idioms, level, setNo, onExit, onFinish }: Props) {
    const supabase = createClient()
    const [quiz, setQuiz] = useState<ArrangeQuestion[]>([])
    const [index, setIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [quizState, setQuizState] = useState<QuizState>('playing')
    const [timerReset, setTimerReset] = useState(0)

    // 사용자가 선택한 글자 순서
    const [selected, setSelected] = useState<number[]>([])  // shuffledChars의 인덱스
    // 각 shuffled 글자의 사용 여부
    const [used, setUsed] = useState<boolean[]>([])
    const [timedOut, setTimedOut] = useState(false)

    const wrongIdiomIdsRef = useRef<number[]>([])
    const wrongSavedRef = useRef(false)
    const finishCalledRef = useRef(false)
    const nextBtnRef = useRef<HTMLButtonElement>(null)

    const initQuiz = useCallback(() => {
        setQuiz(buildArrangeQuiz(idioms))
        setIndex(0)
        setScore(0)
        setSelected([])
        setUsed(new Array(4).fill(false))
        setQuizState('playing')
        setTimerReset(t => t + 1)
        wrongIdiomIdsRef.current = []
        wrongSavedRef.current = false
        finishCalledRef.current = false
    }, [idioms])

    useEffect(() => { initQuiz() }, [initQuiz])

    // 문제 전환 시 선택 초기화
    useEffect(() => {
        const current = quiz[index]
        if (!current) return
        setSelected([])
        setUsed(new Array(current.shuffledChars.length).fill(false))
    }, [index, quiz])

    function handleNext() {
        setTimedOut(false)
        if (index + 1 >= quiz.length) setQuizState('finished')
        else {
            setIndex(i => i + 1)
            setQuizState('playing')
            setTimerReset(t => t + 1)
        }
    }

    // 퀴즈 종료 처리
    useEffect(() => {
        if (quizState !== 'finished') return
        if (!finishCalledRef.current) {
            finishCalledRef.current = true
            onFinish?.(score, quiz.length)

            if (level && setNo != null) {
                ;(async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    const loginInfoId = user.user_metadata?.login_info_id
                    if (!loginInfoId) return
                    await supabase.from('korean_activity_log').insert({
                        user_id: loginInfoId,
                        activity_type: 'arrange_complete',
                        level,
                        set_no: setNo,
                        score,
                        total: quiz.length,
                    })
                })()
            }
        }
    }, [quizState, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

    async function saveWrongWord(idiomId: number) {
        try {
            const stored: Record<number, { wrong_count: number; consecutive_correct: number; status: string; last_wrong_at: string }> =
                JSON.parse(localStorage.getItem('local_korean_wrong') || '{}')
            const existing = stored[idiomId] || { wrong_count: 0, consecutive_correct: 0, status: 'Learning', last_wrong_at: '' }
            existing.wrong_count += 1
            existing.consecutive_correct = 0
            existing.status = 'Learning'
            existing.last_wrong_at = new Date().toISOString()
            stored[idiomId] = existing
            localStorage.setItem('local_korean_wrong', JSON.stringify(stored))
        } catch { /* ignore */ }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.rpc('record_korean_wrong_words', {
            p_user_id: user.user_metadata?.login_info_id,
            p_idiom_ids: [idiomId],
        })
    }

    const current = quiz[index]
    if (!current) return null

    // 글자 선택 (탭)
    function handleCharSelect(charIndex: number) {
        if (quizState !== 'playing' || used[charIndex]) return

        const newSelected = [...selected, charIndex]
        const newUsed = [...used]
        newUsed[charIndex] = true
        setSelected(newSelected)
        setUsed(newUsed)

        // 4글자 모두 선택 완료 시 정답 체크
        if (newSelected.length === current.correctChars.length) {
            const answer = newSelected.map(i => current.shuffledChars[i]).join('')
            const correct = current.correctChars.join('')

            if (answer === correct) {
                setScore(s => s + 1)
                setQuizState('correct')
            } else {
                setQuizState('wrong')
            }
        }
    }

    // 슬롯 클릭 → 마지막 글자 취소
    function handleSlotClick(slotIndex: number) {
        if (quizState !== 'playing') return
        if (slotIndex !== selected.length - 1) return // 마지막만 취소 가능

        const charIndex = selected[slotIndex]
        const newSelected = selected.slice(0, -1)
        const newUsed = [...used]
        newUsed[charIndex] = false
        setSelected(newSelected)
        setUsed(newUsed)
    }

    // 타임아웃
    function handleTimeout() {
        if (quizState !== 'playing') return
        setTimedOut(true)
        setQuizState('wrong')
    }

    /* 결과 화면 */
    if (quizState === 'finished') {
        const pct = Math.round((score / quiz.length) * 100)
        const isSuccess = pct >= 90
        const emoji = pct === 100 ? '🏆' : pct >= 90 ? '🎉' : pct >= 70 ? '👍' : '💪'
        return (
            <motion.div
                className={`${styles.glass} ${styles.quizResult}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
            >
                <div className={styles.resultEmoji}>{emoji}</div>
                <h2 className={styles.resultTitle}>배열 퀴즈 완료!</h2>
                <p className={styles.resultScore}>
                    <span className={styles.resultCorrect}>{score}</span>
                    <span className={styles.resultTotal}> / {quiz.length}</span>
                </p>
                <p className={styles.resultPct}>{pct}% 정답</p>
                <p className={isSuccess ? styles.resultSuccess : styles.resultFail}>
                    {isSuccess ? '성공! (90% 이상)' : '90% 이상이면 성공입니다'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <motion.button className={styles.retryBtn} onClick={initQuiz} whileTap={{ scale: 0.93 }} transition={spring}>
                        다시 풀기
                    </motion.button>
                    {onExit && (
                        <motion.button
                            className={styles.retryBtn}
                            onClick={onExit}
                            whileTap={{ scale: 0.93 }}
                            transition={spring}
                            style={{ background: 'linear-gradient(135deg, #475569, #64748b)' }}
                        >나가기</motion.button>
                    )}
                </div>
            </motion.div>
        )
    }

    const progressPct = (index / quiz.length) * 100
    const selectedChars = selected.map(i => current.shuffledChars[i])

    return (
        <div className={styles.quiz}>
            {/* 진행 바 */}
            <div className={`${styles.glass} ${styles.progressRow}`}>
                <div className={styles.progressBar}>
                    <motion.div className={styles.progressFill} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} />
                </div>
                <span className={styles.progressText}>{index + 1} / {quiz.length}</span>
            </div>

            {/* 배지 + 타이머 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className={styles.typeBadge}>배열 퀴즈 · 6초</span>
            </div>
            <QuizTimerBar
                onTimeout={handleTimeout}
                resetTrigger={timerReset}
                stopped={quizState !== 'playing'}
                totalTimeSec={6}
            />

            {/* 힌트 (뜻) */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    className={`${styles.glass} ${styles.arrangeHint}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={spring}
                >
                    {current.idiom.meaning}
                </motion.div>
            </AnimatePresence>

            {/* 조합 슬롯 */}
            <div className={styles.arrangeSlots}>
                {current.correctChars.map((_, i) => {
                    const filled = i < selected.length
                    let slotCls = styles.arrangeSlot
                    if (filled) slotCls += ` ${styles.arrangeSlotFilled}`
                    if (quizState === 'wrong' && filled) {
                        const isCharCorrect = selectedChars[i] === current.correctChars[i]
                        if (isCharCorrect) slotCls += ` ${styles.arrangeSlotCorrect}`
                        else slotCls += ` ${styles.arrangeSlotWrong}`
                    }

                    return (
                        <motion.div
                            key={i}
                            className={slotCls}
                            onClick={() => handleSlotClick(i)}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ ...spring, delay: i * 0.05 }}
                        >
                            {filled ? selectedChars[i] : ''}
                        </motion.div>
                    )
                })}
            </div>

            {/* 글자 선택 버튼 */}
            <div className={styles.arrangeChars}>
                {current.shuffledChars.map((char, i) => (
                    <motion.button
                        key={`${index}-${i}`}
                        className={styles.arrangeCharBtn}
                        onClick={() => handleCharSelect(i)}
                        disabled={used[i] || quizState !== 'playing'}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: i * 0.06 }}
                        whileTap={!used[i] && quizState === 'playing' ? { scale: 0.88 } : {}}
                    >
                        {char}
                    </motion.button>
                ))}
            </div>

            {/* 정답/오답 피드백 */}
            <AnimatePresence>
                {(quizState === 'correct' || quizState === 'wrong') && (
                    <motion.div
                        className={`${styles.glass} ${styles.wrongFeedback}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={spring}
                    >
                        <p>
                            {quizState === 'correct'
                                ? '✅ 정답!'
                                : timedOut
                                    ? <>⏰ 시간 초과!</>
                                    : <>오답!</>}
                        </p>
                        {/* 글자별 훈음 */}
                        {current.idiom.char_meanings && (
                            <div className={styles.charBreakdown}>
                                {current.correctChars.map((char, i) => {
                                    const cm = current.idiom.char_meanings
                                    const meaning = cm ? cm[char] : null
                                    return (
                                        <div key={i} className={styles.charBreakdownRow}>
                                            <span className={styles.charBreakdownChar}>{char}</span>
                                            <span className={styles.charBreakdownArrow}>→</span>
                                            <span className={styles.charBreakdownMeaning}>
                                                {meaning || ''}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 다음 버튼 */}
            {(quizState === 'correct' || quizState === 'wrong') && (
                <motion.button
                    ref={nextBtnRef}
                    className={styles.navBtn}
                    onClick={handleNext}
                    whileTap={{ scale: 0.93 }}
                    transition={spring}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onAnimationComplete={() => nextBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
                    style={{ width: '100%' }}
                >
                    다음 →
                </motion.button>
            )}
        </div>
    )
}
