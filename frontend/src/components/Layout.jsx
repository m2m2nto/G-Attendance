import React, { useState } from "react";
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, IconButton, MenuItem, Select, FormControl, useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import GroupIcon from "@mui/icons-material/Group";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import EventIcon from "@mui/icons-material/Event";
import SettingsIcon from "@mui/icons-material/Settings";

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { id: "team", label: "Team Overview", icon: <GroupIcon /> },
  { id: "vacation", label: "Vacation", icon: <BeachAccessIcon /> },
  { id: "sick", label: "Sick Leave", icon: <LocalHospitalIcon /> },
  { id: "holidays", label: "Public Holidays", icon: <EventIcon /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon /> },
];

const YEARS = [];
for (let y = new Date().getFullYear() + 1; y >= 2022; y--) {
  YEARS.push(y);
}

export default function Layout({ page, setPage, year, setYear, children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerContent = (
    <Box sx={{ pt: 1 }}>
      <List>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.id}
            selected={page === item.id}
            onClick={() => {
              setPage(item.id);
              if (isMobile) setMobileOpen(false);
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: page === item.id ? "primary.main" : "text.secondary" }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: "0.875rem",
                fontWeight: page === item.id ? 600 : 400,
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1, color: "text.secondary" }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ color: "text.primary", flexGrow: 1, fontSize: "1.25rem" }}>
            G-Attendance
          </Typography>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                fontSize: "0.875rem",
              }}
            >
              {YEARS.map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH, mt: "64px" } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, mt: "64px", bgcolor: "background.default" },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: "64px",
          p: 3,
          width: isMobile ? "100%" : `calc(100% - ${DRAWER_WIDTH}px)`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
