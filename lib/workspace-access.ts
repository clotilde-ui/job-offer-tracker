import { NextRequest } from "next/server";
import { Session } from "next-auth";

export function resolveWorkspaceId(session: Session, req: NextRequest, paramName = "workspaceId") {
  const isAdmin = session.user.role === "ADMIN";
  const requestedWorkspaceId = new URL(req.url).searchParams.get(paramName);

  if (isAdmin) {
    return requestedWorkspaceId;
  }

  return session.user.workspaceId ?? null;
}

export function requireUserWorkspace(session: Session) {
  if (session.user.role === "ADMIN") return null;
  return session.user.workspaceId ?? null;
}
