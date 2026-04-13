/** korean_idioms 테이블의 레벨 */
export type Level = 'beginner' | 'intermediate' | 'advanced'

/** korean_idioms 테이블 행 타입 */
export interface Idiom {
    id: number
    idiom: string              // "전화위복"
    hanja: string | null       // "轉禍爲福"
    meaning: string            // "화가 바뀌어 오히려 복이 됨"
    char_meanings: Record<string, string> | null  // {"전":"구를 전(轉)", ...}
    level: Level
    set_no: number
    example_sentence: string | null
    origin: string | null
    created_at: string
}

/** 오답 기록 */
export interface WrongIdiomEntry {
    id: number
    idiom_id: number
    wrong_count: number
    consecutive_correct: number
    status: string
    last_wrong_at: string
    idiom: Idiom
}
