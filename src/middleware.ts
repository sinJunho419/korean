import { NextRequest, NextResponse } from 'next/server'

/**
 * 입시내비 SSO 쿠키(ipsinavi_login) + Supabase 세션 쿠키가 모두 있어야
 * 보호 페이지 접근을 허용한다. 브라우저로 직접 주소를 입력하면 차단된다.
 */
export function middleware(request: NextRequest) {
  const loginCookie = request.cookies.get('ipsinavi_login')
  const hasSupabaseSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  if (!loginCookie?.value || !hasSupabaseSession) {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>사자성어 학습</title></head>
<body>
<script>
  alert("잘못된 접근입니다.");
  window.close();
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0c29;color:#fff;font-family:sans-serif;"><div style="text-align:center;"><h2>잘못된 접근입니다.</h2><p style="color:#94a3b8;">이 창을 닫아주세요.</p></div></div>';
</script>
</body>
</html>`,
      {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/study/:path*'],
}
