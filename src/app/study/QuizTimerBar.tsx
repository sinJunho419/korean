import { useState, useEffect, useRef } from 'react'
import styles from './study.module.css'

interface Props {
    onTimeout: () => void
    resetTrigger: number
    stopped: boolean
    totalTimeSec?: number
    accentColor?: string
}

export default function QuizTimerBar({
    onTimeout,
    resetTrigger,
    stopped,
    totalTimeSec = 6,
    accentColor,
}: Props) {
    const [progress, setProgress] = useState(100)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        setProgress(100)
        const expiredRef = { current: false }

        const totalTime = totalTimeSec * 1000
        const intervalTime = 10
        const step = (intervalTime / totalTime) * 100

        timerRef.current = setInterval(() => {
            setProgress((prev) => {
                const next = prev - step
                if (next <= 0) {
                    if (timerRef.current) clearInterval(timerRef.current)
                    if (!expiredRef.current) {
                        expiredRef.current = true
                        setTimeout(onTimeout, 0)
                    }
                    return 0
                }
                return next
            })
        }, intervalTime)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [resetTrigger, totalTimeSec]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (stopped && timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [stopped])

    const barColor = accentColor
        ? accentColor
        : progress > 50 ? '#8BC34A' : progress > 25 ? '#66BB6A' : '#ef4444'

    return (
        <div className={styles.timerBarTrack}>
            <div
                className={styles.timerBarFill}
                style={{ width: `${progress}%`, backgroundColor: barColor }}
            />
        </div>
    )
}
