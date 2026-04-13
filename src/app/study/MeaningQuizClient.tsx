'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Idiom } from '@/types/idiom'
import QuizTimerBar from './QuizTimerBar'
import styles from './study.module.css'

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
}

type QuizState = 'playing' | 'correct' | 'wrong' | 'finished'

interface QuizQuestion {
    idiom: Idiom
    options: string[]
    correct: string
}

function buildQuiz(idioms: Idiom[]): QuizQuestion[] {
    const allMeanings = idioms.map(i => i.meaning)
    return shuffle(idioms).map(idiom => {
        const correct = idiom.meaning
        const wrongs = shuffle(allMeanings.filter(m => m !== correct)).slice(0, 3)
        while (wrongs.length < 3) wrongs.push('(없음)')
        return { idiom, options: shuffle([correct, ...wrongs]), correct }
    })
}

const spring: Transition = { type: 'spring', stiffness: 420, damping: 30 }

interface Props {
    idioms: Idiom[]
    level: string
    setNo: number
    onExit?: () => void
    onFinish?: (score: number, total: number) => void
}

export default function MeaningQuizClient({ idioms, level, setNo, onExit, onFinish }: Props) {
    const supabase = createClient()
    const [quiz, setQuiz] = useState<QuizQuestion[]>([])
    const [index, setIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [quizState, setQuizState] = useState<QuizState>('playing')
    const [timerReset, setTimerReset] = useState(0)

    const wrongIdiomIdsRef = useRef<number[]>([])
    const wrongSavedRef = useRef(false)
    const finishCalledRef = useRef(false)
    const nextBtnRef = useRef<HTMLButtonElement>(null)

    const initQuiz = useCallback(() => {
        setQuiz(buildQuiz(idioms))
        setIndex(0); setScore(0)
        setSelected(null); setQuizState('playing')
        setTimerReset(t => t + 1)
        wrongIdiomIdsRef.current = []
        wrongSavedRef.current = false
        finishCalledRef.current = false
    }, [idioms])

    useEffect(() => { initQuiz() }, [initQuiz])

    function handleNext() {
        if (index + 1 >= quiz.length) setQuizState('finished')
        else { setIndex(i => i + 1); setSelected(null); setQuizState('playing'); setTimerReset(t => t + 1) }
    }

    // 종료 처리
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
                        activity_type: 'quiz_complete',
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

    function handleTimeout() {
        if (selected !== null || quizState !== 'playing') return
        saveWrongWord(current.idiom.id)
        setSelected('__timeout__')
        setQuizState('wrong')
    }

    function handleSelect(option: string) {
        if (selected !== null) return
        setSelected(option)

        if (option === current.correct) {
            setScore(s => s + 1)
            setQuizState('correct' as QuizState)
        } else {
            saveWrongWord(current.idiom.id)
            setQuizState('wrong')
        }
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
                <h2 className={styles.resultTitle}>의미 퀴즈 완료!</h2>
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
                <span className={styles.typeBadge}>의미 퀴즈 · 6초</span>
            </div>
            <QuizTimerBar
                onTimeout={handleTimeout}
                resetTrigger={timerReset}
                stopped={selected !== null}
                totalTimeSec={6}
            />

            {/* 문제 카드: 사자성어 표시 → 뜻 선택 */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    className={`${styles.glass} ${styles.quizQuestion}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={spring}
                >
                    <ruby className={styles.rubyText} style={{ fontSize: '2rem' }}>
                        {current.idiom.idiom}
                        <rt>{current.idiom.hanja || ''}</rt>
                    </ruby>
                </motion.div>
            </AnimatePresence>

            {/* 선택지 (뜻 4개) */}
            <div className={styles.quizOptions}>
                {current.options.map((opt, i) => {
                    let cls = styles.quizOption
                    if (selected !== null) {
                        if (opt === current.correct) cls = `${styles.quizOption} ${styles.optCorrect}`
                        else if (opt === selected) cls = `${styles.quizOption} ${styles.optWrong}`
                        else cls = `${styles.quizOption} ${styles.optDim}`
                    }
                    return (
                        <motion.button
                            key={`${index}-${i}`}
                            className={cls}
                            onClick={() => handleSelect(opt)}
                            disabled={selected !== null}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...spring, delay: i * 0.06 }}
                            whileTap={selected === null ? { scale: 0.94 } : {}}
                        >
                            {opt}
                        </motion.button>
                    )
                })}
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
                                : selected === '__timeout__'
                                    ? <>⏰ 시간 초과!</>
                                    : <>오답!</>}
                        </p>
                        {/* 글자별 훈음 */}
                        {current.idiom.char_meanings && (
                            <div className={styles.charBreakdown}>
                                {current.idiom.idiom.split('').map((char, i) => {
                                    const meaning = current.idiom.char_meanings?.[char]
                                    return (
                                        <div key={i} className={styles.charBreakdownRow}>
                                            <span className={styles.charBreakdownChar}>{char}</span>
                                            <span className={styles.charBreakdownArrow}>→</span>
                                            <span className={styles.charBreakdownMeaning}>{meaning || ''}</span>
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
