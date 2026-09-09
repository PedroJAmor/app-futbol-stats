import AccountDrawer from "./AccountDrawer";
import MobileTabBar from "./MobileTabBar";
import SwipeNavigation from "./SwipeNavigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <strong className="brand">Fútbol Amigos</strong>
        <AccountDrawer />
      </header>
      <SwipeNavigation>{children}</SwipeNavigation>
      <MobileTabBar />
    </div>
  );
}
