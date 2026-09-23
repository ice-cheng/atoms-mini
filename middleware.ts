import { NextResponse, type NextRequest } from "next/server";

// 强制登录：未带会话 cookie 访问工作台直接跳首页。
// 真正的鉴权在各 API 里用 getCurrentUser 校验；这里只做前端入口拦截。
export function middleware(req: NextRequest) {
  const token = req.cookies.get("atoms_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
