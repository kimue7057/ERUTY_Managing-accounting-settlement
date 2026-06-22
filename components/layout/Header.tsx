import { PageHeader } from "@/components/common/PageHeader";
import type { RoleView } from "@/types";

type HeaderProps = {
  title: string;
  description: string;
  roles: RoleView[];
  activeRole: RoleView;
};

export function Header({ title, description, roles, activeRole }: HeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      roles={roles}
      activeRole={activeRole}
      eyebrow="관리자 포털"
    />
  );
}
