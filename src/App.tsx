import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { StoreProvider } from "./store/store";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { Shell } from "./components/Shell";
import { ProjectDetail } from "./pages/projects/ProjectDetail";
import { ProjectList } from "./pages/projects/ProjectList";
import { Tasks } from "./pages/Tasks";
import { ContactDetail, ContactList } from "./pages/Contacts";
import { HabitDetail, HabitList } from "./pages/Habits";
import { Assistant } from "./pages/Assistant";
import { Updates } from "./pages/Updates";
import { ProjectSites } from "./pages/ProjectSites";
import { ExecutiveUpdate } from "./pages/ExecutiveUpdate";
import { Login } from "./pages/Login";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    // supabase-js coordinates token refresh across tabs via the Web Locks API, and Safari
    // has a documented bug where a lock from a previous page load can fail to release on
    // reload — leaving getSession() hanging forever. Race it against a timeout so the app
    // always renders instead of staying blank.
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<"timeout">((resolve) => {
      timeoutId = setTimeout(() => resolve("timeout"), 5000);
    });

    Promise.race([supabase.auth.getSession(), timeout])
      .then((result) => {
        if (cancelled) return;
        if (result !== "timeout") setSession(result.data.session);
        setAuthReady(true);
      })
      .catch(() => {
        if (!cancelled) setAuthReady(true);
      })
      .finally(() => clearTimeout(timeoutId));

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!authReady) return null;

  // With Supabase configured, gate behind Google sign-in; otherwise run in local demo mode.
  if (supabaseConfigured && !session) {
    return <Login />;
  }

  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/contacts" element={<ContactList />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/habits" element={<HabitList />} />
            <Route path="/habits/:id" element={<HabitDetail />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/project-sites" element={<ProjectSites />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/executive-update" element={<ExecutiveUpdate />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
