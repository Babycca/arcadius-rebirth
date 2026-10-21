import withAuth from "next-auth/middleware";

export default withAuth;

export const config = {
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico|images|manifest.webmanifest).*)",
  ],
};
