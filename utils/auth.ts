import type { AuthProfile, AuthRole, ProfileStatus, RoleView } from "@/types";

type RouteAccessRule = {
  prefix: string;
  roles: AuthRole[];
  reason: string;
};

const routeAccessRules: RouteAccessRule[] = [
  {
    prefix: "/dev",
    roles: ["admin"],
    reason: "개발 확인용 화면은 admin 계정만 접근할 수 있습니다.",
  },
  {
    prefix: "/settings",
    roles: ["admin"],
    reason: "설정 화면은 admin 계정만 접근할 수 있습니다.",
  },
  {
    prefix: "/accounting",
    roles: ["admin"],
    reason: "회계 자료 화면은 admin 계정만 접근할 수 있습니다.",
  },
  {
    prefix: "/settlements",
    roles: ["admin"],
    reason: "월말 정산 화면은 admin 계정만 접근할 수 있습니다.",
  },
  {
    prefix: "/funds",
    roles: ["admin"],
    reason: "회사 자금 현황 화면은 admin 계정만 접근할 수 있습니다.",
  },
  {
    prefix: "/approvals",
    roles: ["manager", "admin"],
    reason: "승인 대기함과 지출 상세 검토는 manager 또는 admin 계정만 접근할 수 있습니다.",
  },
  {
    prefix: "/projects",
    roles: ["manager", "admin"],
    reason: "프로젝트 예산 화면은 manager 또는 admin 계정만 접근할 수 있습니다.",
  },
  {
    prefix: "/expenses/request",
    roles: ["employee", "admin"],
    reason: "지출 기안 작성은 employee 또는 admin 계정만 사용할 수 있습니다.",
  },
  {
    prefix: "/expenses/history",
    roles: ["employee", "admin"],
    reason: "내 지출 내역은 employee 또는 admin 계정만 접근할 수 있습니다.",
  },
  {
    prefix: "/",
    roles: ["employee", "manager", "admin"],
    reason: "대시보드는 로그인한 사용자만 접근할 수 있습니다.",
  },
];

function getMatchingRouteRule(pathname: string) {
  return routeAccessRules.find((rule) =>
    rule.prefix === "/"
      ? pathname === "/"
      : pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
  );
}

export function mapAuthRoleToView(role: AuthRole): RoleView {
  switch (role) {
    case "admin":
      return "대표 보기";
    case "manager":
      return "관리자 보기";
    case "employee":
    default:
      return "직원 보기";
  }
}

export function mapAuthRoleLabel(role: AuthRole) {
  switch (role) {
    case "admin":
      return "대표";
    case "manager":
      return "관리자";
    case "employee":
    default:
      return "직원";
  }
}

export function isAdmin(role: AuthRole | null | undefined) {
  return role === "admin";
}

export function isManagerOrAdmin(role: AuthRole | null | undefined) {
  return role === "manager" || role === "admin";
}

export function canAccessPath(role: AuthRole, pathname: string) {
  const routeRule = getMatchingRouteRule(pathname);

  if (!routeRule) {
    return true;
  }

  return routeRule.roles.includes(role);
}

export function getPathAccessReason(pathname: string) {
  return getMatchingRouteRule(pathname)?.reason ?? "현재 계정으로는 이 화면에 접근할 수 없습니다.";
}

export function getAllowedRolesForPath(pathname: string) {
  return getMatchingRouteRule(pathname)?.roles ?? ["employee", "manager", "admin"];
}

export function getDefaultAuthorizedPath(role: AuthRole) {
  switch (role) {
    case "manager":
    case "admin":
      return "/";
    case "employee":
    default:
      return "/expenses/history";
  }
}

export function resolveAuthorizedPath(role: AuthRole, requestedPath: string | null | undefined) {
  if (!requestedPath || !requestedPath.startsWith("/")) {
    return getDefaultAuthorizedPath(role);
  }

  if (!canAccessPath(role, requestedPath)) {
    return getDefaultAuthorizedPath(role);
  }

  return requestedPath;
}

export function getProfileStatus(
  profile:
    | Pick<AuthProfile, "status" | "isActive">
    | { status?: string | null; isActive?: boolean | null; is_active?: boolean | null },
): ProfileStatus {
  const legacyIsActive = "is_active" in profile ? profile.is_active : undefined;

  if (profile.status === "inactive" || profile.isActive === false || legacyIsActive === false) {
    return "inactive";
  }

  return "active";
}

export function getUserInitials(name: string | null | undefined) {
  const trimmedName = name?.trim() ?? "";

  if (trimmedName.length === 0) {
    return "ER";
  }

  return trimmedName.slice(0, 2).toUpperCase();
}
