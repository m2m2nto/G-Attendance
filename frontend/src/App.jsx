import React, { useState, useCallback, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import Layout from "./components/Layout";
import TeamOverview from "./components/TeamOverview";
import VacationPage from "./components/VacationPage";
import SickLeavePage from "./components/SickLeavePage";
import HolidaysPage from "./components/HolidaysPage";
import SettingsPage from "./components/SettingsPage";
import RecapDialog from "./components/RecapDialog";
import RecapReminderBanner from "./components/RecapReminderBanner";
import { getAppUsers, getRecapStatus } from "./api/client";

const PAGES = {
  team: TeamOverview,
  vacation: VacationPage,
  sick: SickLeavePage,
  holidays: HolidaysPage,
  settings: SettingsPage,
};

export default function App() {
  const [page, setPage] = useState("team");
  const [year, setYear] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);
  const [appUsers, setAppUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapStatus, setRecapStatus] = useState(null);
  const [recapSnoozed, setRecapSnoozed] = useState(false); // "Later" lasts until the next launch

  // Clear the universal search when switching pages — a query is scoped to one view.
  const changePage = useCallback((next) => {
    setSearch("");
    setPage(next);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    getRecapStatus().then(setRecapStatus).catch(() => {});
  }, []);

  // Electron: a click on the "recap due" notification opens the recap dialog.
  useEffect(() => {
    const electron = window.electronAPI;
    if (!electron?.onRecapOpen) return undefined;
    electron.onRecapOpen(() => setRecapOpen(true));
    electron.takePendingRecapOpen().then((pending) => pending && setRecapOpen(true));
    return () => electron.removeRecapListeners();
  }, []);

  const handleRecapSent = useCallback((status) => {
    setRecapStatus(status);
    window.electronAPI?.refreshRecapStatus?.(); // clear the Dock badge now, not at the next hourly poll
  }, []);

  useEffect(() => {
    getAppUsers().then((data) => {
      setAppUsers(data.users || []);
      setCurrentUser(data.current_user || null);
    });
  }, []);

  const PageComponent = PAGES[page] || TeamOverview;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout
        page={page}
        setPage={changePage}
        year={year}
        setYear={setYear}
        search={search}
        setSearch={setSearch}
        appUsers={appUsers}
        setAppUsers={setAppUsers}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        recapBanner={!recapSnoozed && (
          <RecapReminderBanner
            status={recapStatus}
            onOpenRecap={() => setRecapOpen(true)}
            onLater={() => setRecapSnoozed(true)}
          />
        )}
      >
        <PageComponent
          year={year}
          key={`${page}-${year}-${refreshKey}`}
          onDataChange={triggerRefresh}
          currentUser={currentUser}
          search={search}
          onOpenRecap={() => setRecapOpen(true)}
        />
      </Layout>
      <RecapDialog open={recapOpen} onClose={() => setRecapOpen(false)} onSent={handleRecapSent} />
    </ThemeProvider>
  );
}
