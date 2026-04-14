import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * 입시내비 → 사자성어 앱 로그아웃 콜백
 *
 * POST /api/auth/logout
 * Body: { nid: string, secret: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { nid, secret } = body as { nid?: string; secret?: string }

  if (!nid || !secret) {
    return NextResponse.json({ error: 'Missing nid or secret' }, { status: 400 })
  }

  const expectedSecret = process.env.IPSI_NAVI_LOGOUT_SECRET
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const email = `nid_${nid}@inputnavi.internal`

  const { data: users } = await adminClient.auth.admin.listUsers()
  const user = users?.users?.find((u) => u.email === email)

  if (!user) {
    return NextResponse.json({ ok: true, message: 'User not found, nothing to do' })
  }

  await adminClient.auth.admin.signOut(user.id, 'global')

  return NextResponse.json({ ok: true })
}
