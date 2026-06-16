import React, { useState, useCallback, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import Layout from "./components/Layout";
import TeamOverview from "./components/TeamOverview";
import VacationPage from "./components/VacationPage";
import SickLeavePage from "./components/SickLeavePage";
import HolidaysPage from "./components/HolidaysPage";
import SettingsPage from "./components/SettingsPage";
import { getAppUsers } from "./api/client";

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

  // Clear the universal search when switching pages — a query is scoped to one view.
  const changePage = useCallback((next) => {
    setSearch("");
    setPage(next);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
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
      >
        <PageComponent
          year={year}
          key={`${page}-${year}-${refreshKey}`}
          onDataChange={triggerRefresh}
          currentUser={currentUser}
          search={search}
        />
      </Layout>
    </ThemeProvider>
  );
}
