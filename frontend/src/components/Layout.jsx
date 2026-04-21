import React, { useState, useEffect } from "react";
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, IconButton, Avatar, Menu, MenuItem, ListItemAvatar,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, useMediaQuery, useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import GroupIcon from "@mui/icons-material/Group";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import EventIcon from "@mui/icons-material/Event";
import SettingsIcon from "@mui/icons-material/Settings";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckIcon from "@mui/icons-material/Check";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import UpdateBanner from "./UpdateBanner";
import { setCurrentUser as apiSetCurrentUser, addAppUser } from "../api/client";

const DRAWER_WIDTH = 240;
const TITLE_BAR_HEIGHT = 38;

const NAV_ITEMS = [
  { id: "team", label: "Team Overview", icon: <GroupIcon /> },
  { id: "vacation", label: "Vacation", icon: <BeachAccessIcon /> },
  { id: "sick", label: "Sick Leave", icon: <LocalHospitalIcon /> },
  { id: "holidays", label: "Public Holidays", icon: <EventIcon /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon /> },
];

const MIN_YEAR = 2022;
const MAX_YEAR = new Date().getFullYear() + 1;

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Layout({
  page, setPage, year, setYear, children,
  appUsers, setAppUsers, currentUser, setCurrentUser,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");

  // Close sidebar on mobile by default
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const currentPageLabel = NAV_ITEMS.find((n) => n.id === page)?.label || "";

  const handleSelectUser = async (name) => {
    setUserMenuAnchor(null);
    try {
      await apiSetCurrentUser(name);
      setCurrentUser(name);
    } catch {
      // silent
    }
  };

  const handleAddUser = async () => {
    const name = newUserName.trim();
    if (!name) return;
    try {
      const result = await addAppUser(name);
      setAppUsers(result.users);
      setCurrentUser(result.current_user);
      setAddUserOpen(false);
      setNewUserName("");
    } catch {
      // silent
    }
  };

  const drawerContent = (
    <Box sx={{ pt: 1 }}>
      <List>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.id}
            selected={page === item.id}
            onClick={() => {
              setPage(item.id);
              if (isMobile) setSidebarOpen(false);
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

  const toolbarTop = TITLE_BAR_HEIGHT;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Draggable title bar band */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: TITLE_BAR_HEIGHT,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: (t) => t.zIndex.drawer + 2,
          WebkitAppRegion: "drag",
        }}
      />

      {/* Toolbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          top: TITLE_BAR_HEIGHT,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: "56px !important", gap: 1 }}>
          {/* App icon + name */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 1, WebkitAppRegion: "no-drag" }}>
            <img
              src="/icon.png"
              alt="G-Attendance"
              style={{ width: 28, height: 28, borderRadius: 6 }}
            />
            <Typography
              variant="h6"
              sx={{
                color: "text.primary",
                fontSize: "1rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
                display: { xs: "none", sm: "block" },
              }}
            >
              G-Attendance
            </Typography>
          </Box>

          {/* Divider */}
          <Box sx={{ width: 1, height: 24, bgcolor: "divider", mx: 0.5 }} />

          {/* Hamburger + page title */}
          <IconButton
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{ color: "text.secondary", WebkitAppRegion: "no-drag" }}
            size="small"
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="body1"
            sx={{
              color: "text.primary",
              fontWeight: 500,
              fontSize: "0.95rem",
              whiteSpace: "nowrap",
              WebkitAppRegion: "no-drag",
            }}
          >
            {currentPageLabel}
          </Typography>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Year navigation */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0, WebkitAppRegion: "no-drag" }}>
            <IconButton
              size="small"
              onClick={() => setYear((y) => Math.max(MIN_YEAR, y - 1))}
              disabled={year <= MIN_YEAR}
              sx={{ color: "text.secondary" }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Box
              sx={{
                px: 2,
                py: 0.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                minWidth: 64,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.9rem", color: "text.primary" }}>
                {year}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setYear((y) => Math.min(MAX_YEAR, y + 1))}
              disabled={year >= MAX_YEAR}
              sx={{ color: "text.secondary" }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* User selector */}
          <Box
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: 1.5,
              cursor: "pointer",
              WebkitAppRegion: "no-drag",
              borderRadius: 2,
              px: 1,
              py: 0.5,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "#3c4043",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {getInitials(currentUser)}
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                whiteSpace: "nowrap",
                color: "text.primary",
                display: { xs: "none", sm: "block" },
              }}
            >
              {currentUser || "Select user"}
            </Typography>
            <ArrowDropDownIcon sx={{ color: "text.secondary", fontSize: 20 }} />
          </Box>

          {/* User dropdown menu */}
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { minWidth: 200, borderRadius: 3, mt: 0.5 } } }}
          >
            {appUsers.map((name) => (
              <MenuItem
                key={name}
                onClick={() => handleSelectUser(name)}
                selected={name === currentUser}
                sx={{ borderRadius: 1, mx: 0.5, gap: 1.5 }}
              >
                <ListItemAvatar sx={{ minWidth: 0 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "#3c4043", fontSize: "0.8rem", fontWeight: 600 }}>
                    {getInitials(name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={name} primaryTypographyProps={{ fontSize: "0.9rem" }} />
                {name === currentUser && <CheckIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
              </MenuItem>
            ))}
            {appUsers.length > 0 && <Divider sx={{ my: 0.5 }} />}
            <MenuItem
              onClick={() => { setUserMenuAnchor(null); setAddUserOpen(true); }}
              sx={{ borderRadius: 1, mx: 0.5, gap: 1.5 }}
            >
              <ListItemAvatar sx={{ minWidth: 0 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: "transparent" }}>
                  <PersonAddIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="Add user" primaryTypographyProps={{ fontSize: "0.9rem" }} />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: sidebarOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            top: TITLE_BAR_HEIGHT + 56,
            bgcolor: "background.default",
            borderRight: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: `${TITLE_BAR_HEIGHT + 56}px`,
          p: 3,
          ml: !isMobile && sidebarOpen ? `${DRAWER_WIDTH}px` : 0,
          transition: "margin-left 225ms cubic-bezier(0, 0, 0.2, 1)",
          width: "100%",
        }}
      >
        <UpdateBanner />
        {children}
      </Box>

      {/* Add user dialog */}
      <Dialog
        open={addUserOpen}
        onClose={() => { setAddUserOpen(false); setNewUserName(""); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddUser(); }}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setAddUserOpen(false); setNewUserName(""); }} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAddUser} variant="contained" disabled={!newUserName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
