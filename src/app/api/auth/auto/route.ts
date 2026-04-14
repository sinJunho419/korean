import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const FIVE_MINUTES = 5 * 60

/**
 * 입시내비 WebView 자동 인증
 *
 * GET /api/auth/auto?nid={숫자PK}&ts={Unix초}&sig={HMAC서명}&sname={이름,선택}&user_id={한글ID,선택}&redirect={경로,선택}
 *
 * 흐름: HMAC 검증 → Supabase 유저 생성/조회 → 세션 쿠키 + ipsinavi_login 쿠키 설정 → /study 리다이렉트
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const nid = searchParams.get('nid')
  const ts = searchParams.get('ts')
  const sig = searchParams.get('sig')
  const sname = searchParams.get('sname') || null
  const userId = searchParams.get('user_id') || null
  const redirect = searchParams.get('redirect') || '/study'

  if (!nid || !ts || !sig) {
    return new NextResponse('Missing required parameters: nid, ts, sig', { status: 400 })
  }

  const secret = process.env.AUTH_HMAC_SECRET?.trim()
  if (!secret) {
    console.error('AUTH_HMAC_SECRET is not set')
    return new NextResponse('Server configuration error', { status: 500 })
  }

  const message = `${nid}:${ts}`
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex')

  let valid = false
  try {
    if (expected.length === sig.length) {
      valid = crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'))
    }
  } catch { /* length mismatch */ }

  if (!valid) {
    console.error('Auto-auth HMAC verification failed for nid:', nid)
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const tsNum = parseInt(ts, 10)
  const now = Math.floor(Date.now() / 1000)
  if (isNaN(tsNum) || Math.abs(now - tsNum) > FIVE_MINUTES) {
    return new NextResponse('Token expired', { status: 401 })
  }

  const nidNum = parseInt(nid, 10)
  const adminClient = createAdminClient()
  const email = `nid_${nid}@inputnavi.internal`
  const displayName = sname || `학생_${nid}`

  const metadata = {
    nid,
    sname: displayName,
    external_user_id: userId,
    source: 'inputnavi',
    login_info_id: nidNum,
    provider: 'ipsinavi',
  }

  const { error: createError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (createError && !createError.message.includes('already been registered')) {
    console.error('Auto-provisioning error:', createError.message)
    return new NextResponse('Failed to provision user', { status: 500 })
  }

  if (createError?.message.includes('already been registered')) {
    const { data: users } = await adminClient.auth.admin.listUsers()
    const existingUser = users?.users?.find((u) => u.email === email)
    if (existingUser) {
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        user_metadata: { ...existingUser.user_metadata, ...metadata },
      })
    }
  }

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('generateLink error:', linkError?.message)
    return new NextResponse('Failed to create session', { status: 500 })
  }

  const cookieStore = await cookies()
  const serverClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: otpError } = await serverClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  })

  if (otpError) {
    console.error('verifyOtp error:', otpError.message)
    return new NextResponse('Failed to establish session', { status: 500 })
  }

  cookieStore.set('ipsinavi_login', String(nidNum), {
    path: '/',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
    secure: true,
    httpOnly: false,
  })

  const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  return NextResponse.redirect(`${origin}${redirect}`)
}
