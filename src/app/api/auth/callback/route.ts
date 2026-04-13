import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import crypto from 'crypto'

/**
 * 입시내비 연동 콜백
 *
 * 호출 방식:
 *   GET /api/auth/callback?login_info_id=12345&name=홍길동&ts=1711234567890&sig=HMAC_SIGNATURE
 *
 * 입시내비에서 사용자를 이 URL로 리다이렉트하면:
 *   1. 서명(sig) 검증
 *   2. Supabase에 사용자 생성 또는 기존 사용자 조회
 *   3. 세션 생성 후 /study로 리다이렉트
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const loginInfoId = searchParams.get('login_info_id')
  const name = searchParams.get('name') || '학생'
  const ts = searchParams.get('ts')
  const sig = searchParams.get('sig')

  // 필수 파라미터 체크
  if (!loginInfoId || !ts || !sig) {
    return NextResponse.json(
      { error: '필수 파라미터가 누락되었습니다 (login_info_id, ts, sig)' },
      { status: 400 }
    )
  }

  // 타임스탬프 유효성 (5분 이내)
  const now = Date.now()
  const timestamp = Number(ts)
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return NextResponse.json(
      { error: '만료된 요청입니다' },
      { status: 401 }
    )
  }

  // HMAC 서명 검증
  const secret = process.env.IPSINAVI_SECRET_KEY
  if (!secret) {
    return NextResponse.json(
      { error: '서버 설정 오류 (IPSINAVI_SECRET_KEY 누락)' },
      { status: 500 }
    )
  }

  const payload = `${loginInfoId}:${ts}`
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  if (sig !== expectedSig) {
    return NextResponse.json(
      { error: '유효하지 않은 서명입니다' },
      { status: 401 }
    )
  }

  // Supabase Admin으로 사용자 생성/조회
  const admin = createAdminClient()
  const email = `ipsinavi_${loginInfoId}@ipsinavi.local`
  const password = crypto
    .createHmac('sha256', secret)
    .update(`password:${loginInfoId}`)
    .digest('hex')

  // 기존 사용자 조회
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(
    (u: { email?: string }) => u.email === email
  )

  if (!existingUser) {
    // 새 사용자 생성
    const { error: signUpError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        login_info_id: Number(loginInfoId),
        name,
        provider: 'ipsinavi',
      },
    })

    if (signUpError) {
      return NextResponse.json(
        { error: '사용자 생성 실패', detail: signUpError.message },
        { status: 500 }
      )
    }
  } else {
    // 기존 사용자 메타데이터 업데이트
    await admin.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        login_info_id: Number(loginInfoId),
        name,
        provider: 'ipsinavi',
      },
    })
  }

  // 세션 생성 (서버 쿠키에 저장)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return NextResponse.json(
      { error: '로그인 실패', detail: signInError.message },
      { status: 500 }
    )
  }

  // /study로 리다이렉트
  const redirectUrl = new URL('/study', request.url)
  return NextResponse.redirect(redirectUrl)
}
