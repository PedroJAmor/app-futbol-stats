import AppHeader from "./AppHeader";
import MobileTabBar from "./MobileTabBar";
import SwipeNavigation from "./SwipeNavigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Ir al contenido</a>
      <AppHeader />
      <SwipeNavigation>{children}</SwipeNavigation>
      <MobileTabBar />
    </div>
  );
}
