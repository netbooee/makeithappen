import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { StoreProvider } from "./store/store";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { Shell } from "./components/Shell";
import { ProjectDetail, ProjectList } from "./pages/Projects";
import { Tasks } from "./pages/Tasks";
import { ContactDetail, ContactList } from "./pages/Contacts";
import { HabitDetail, HabitList } from "./pages/Habits";
import { Assistant } from "./pages/Assistant";
import { Updates } from "./pages/Updates";
import { Login } from "./pages/Login";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
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
            <Route path="/assistant" element={<Assistant />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
