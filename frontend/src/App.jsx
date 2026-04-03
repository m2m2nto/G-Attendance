import React, { useState, useCallback } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import Layout from "./components/Layout";
import TeamOverview from "./components/TeamOverview";
import VacationPage from "./components/VacationPage";
import SickLeavePage from "./components/SickLeavePage";
import HolidaysPage from "./components/HolidaysPage";
import SettingsPage from "./components/SettingsPage";

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

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const PageComponent = PAGES[page] || TeamOverview;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout page={page} setPage={setPage} year={year} setYear={setYear}>
        <PageComponent year={year} key={`${page}-${year}-${refreshKey}`} onDataChange={triggerRefresh} />
      </Layout>
    </ThemeProvider>
  );
}
