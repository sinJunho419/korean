import { NextRequest, NextResponse } from 'next/server'

/**
 * 레거시 SSO 엔트리포인트 — 쿼리 그대로 /api/auth/auto로 리다이렉트
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`

  const url = new URL('/api/auth/auto', origin)
  searchParams.forEach((value, key) => url.searchParams.set(key, value))

  return NextResponse.redirect(url.toString())
}
