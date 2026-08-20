import { UserMenu } from "@/components/layout/user-menu";

type AppHeaderProps = {
  title: string;
  userName: string;
  userEmail: string;
  roles: string[];
};

export function AppHeader({
  title,
  userName,
  userEmail,
  roles,
}: AppHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
          suppressHydrationWarning
        >
          AMD Operations
        </p>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <UserMenu name={userName} email={userEmail} roles={roles} />
    </header>
  );
}
