import AccountDrawer from "./AccountDrawer";
import MobileTabBar from "./MobileTabBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <strong className="brand">Fútbol Amigos</strong>
        <AccountDrawer />
      </header>
      <main className="app-main">{children}</main>
      <MobileTabBar />
    </div>
  );
}
