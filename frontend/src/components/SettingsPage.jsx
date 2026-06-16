import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Paper, TextField, Button, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, List,
  ListItemButton, ListItemIcon, ListItemText, Breadcrumbs, Link, Chip,
  CircularProgress,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SaveIcon from "@mui/icons-material/Save";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DescriptionIcon from "@mui/icons-material/Description";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SystemUpdateIcon from "@mui/icons-material/SystemUpdate";
import {
  getConfig, updateConfig, getTeam, addTeamMember,
  getDataFile, setDataFile, browseFiles,
} from "../api/client";


// ---------------------------------------------------------------------------
// File Browser Dialog
// ---------------------------------------------------------------------------

function FileBrowserDialog({ open, onClose, onSelect, initialPath }) {
  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const browse = useCallback(async (path) => {
    setLoading(true);
    try {
      const data = await browseFiles(path);
      setCurrentPath(data.current);
      setParentPath(data.parent);
      setItems(data.items);
      setSelectedFile(null);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      // Start browsing from the directory of the current file
      const startDir = initialPath ? initialPath.substring(0, initialPath.lastIndexOf("/")) : "";
      browse(startDir || "");
    }
  }, [open, initialPath, browse]);

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Select Excel File</DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {/* Breadcrumb path bar */}
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#f8f9fa", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 1 }}>
          {parentPath && (
            <IconButton size="small" onClick={() => browse(parentPath)} sx={{ mr: 0.5 }}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          )}
          <Breadcrumbs maxItems={4} sx={{ fontSize: "0.85rem", flex: 1 }}>
            <Link
              underline="hover"
              color="inherit"
              onClick={() => browse("/")}
              sx={{ cursor: "pointer", fontSize: "0.85rem" }}
            >
              /
            </Link>
            {pathParts.map((part, i) => {
              const fullPath = "/" + pathParts.slice(0, i + 1).join("/");
              const isLast = i === pathParts.length - 1;
              return isLast ? (
                <Typography key={fullPath} color="text.primary" sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  {part}
                </Typography>
              ) : (
                <Link
                  key={fullPath}
                  underline="hover"
                  color="inherit"
                  onClick={() => browse(fullPath)}
                  sx={{ cursor: "pointer", fontSize: "0.85rem" }}
                >
                  {part}
                </Link>
              );
            })}
          </Breadcrumbs>
        </Box>

        {/* File list */}
        <List dense sx={{ maxHeight: 400, overflow: "auto", py: 0 }}>
          {items.length === 0 && !loading && (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No folders or Excel files here
              </Typography>
            </Box>
          )}
          {items.map((item) => (
            <ListItemButton
              key={item.path}
              selected={selectedFile === item.path}
              onClick={() => {
                if (item.type === "dir") {
                  browse(item.path);
                } else {
                  setSelectedFile(item.path);
                }
              }}
              onDoubleClick={() => {
                if (item.type === "dir") {
                  browse(item.path);
                } else {
                  onSelect(item.path);
                }
              }}
              sx={{
                borderBottom: "1px solid #f0f0f0",
                ...(selectedFile === item.path && {
                  bgcolor: "#e8f0fe !important",
                }),
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.type === "dir" ? (
                  <FolderIcon sx={{ color: "#f9ab00" }} />
                ) : (
                  <DescriptionIcon sx={{ color: "#1a73e8" }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.name}
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: item.type === "file" ? 500 : 400,
                }}
              />
              {item.type === "file" && (
                <Chip label=".xlsx" size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
              )}
            </ListItemButton>
          ))}
        </List>

        {/* Selected file display */}
        {selectedFile && (
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#e8f0fe", borderTop: "1px solid #c2d7f4" }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: "#1a73e8" }}>
              <DescriptionIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: "text-bottom" }} />
              {selectedFile.split("/").pop()}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button
          onClick={() => onSelect(selectedFile)}
          variant="contained"
          disabled={!selectedFile}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
}


// ---------------------------------------------------------------------------
// Add Member Dialog
// ---------------------------------------------------------------------------

function AddMemberDialog({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  const [startYear, setStartYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (open) { setName(""); setStartYear(new Date().getFullYear()); }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Team Member</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            label="Start Year"
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(parseInt(e.target.value))}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={() => onSave(name, startYear)} variant="contained" disabled={!name}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}


// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage({ search = "" }) {
  const [config, setConfig] = useState({});
  const [team, setTeam] = useState([]);
  const [baseDays, setBaseDays] = useState("");
  const [accrual, setAccrual] = useState("");
  const [carryover, setCarryover] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [filePath, setFilePath] = useState("");
  const [browseOpen, setBrowseOpen] = useState(false);
  const [appVersion, setAppVersion] = useState({ version: __APP_VERSION__, buildNumber: __APP_BUILD__ });
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const isElectron = !!window.electronAPI?.getAppVersion;

  const load = () => {
    Promise.all([getConfig(), getTeam(), getDataFile()]).then(([c, t, f]) => {
      setConfig(c);
      setBaseDays(c.base_vacation_days || "26");
      setAccrual(c.accrual_per_month || "2.1667");
      setCarryover(c.carryover_deadline_month || "3");
      setTeam(t);
      setFilePath(f.path || "");
    });
  };

  useEffect(load, []);

  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, [isElectron]);

  const handleFileSelect = async (path) => {
    setBrowseOpen(false);
    try {
      const result = await setDataFile(path);
      setFilePath(result.path);
      setSnack({ open: true, message: "Data file updated successfully", severity: "success" });
      load();
    } catch (err) {
      const msg = err.response?.data?.error || "Invalid file";
      setSnack({ open: true, message: msg, severity: "error" });
    }
  };

  const handleSaveConfig = async () => {
    await updateConfig({
      base_vacation_days: baseDays,
      accrual_per_month: accrual,
      carryover_deadline_month: carryover,
    });
    setSnack({ open: true, message: "Settings saved", severity: "success" });
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result?.status === "available") {
        setSnack({
          open: true,
          message: `Update available — v${result.version} (build ${result.buildNumber}). See banner above.`,
          severity: "info",
        });
      } else if (result?.status === "up-to-date") {
        setSnack({ open: true, message: "You're on the latest version.", severity: "success" });
      } else {
        setSnack({
          open: true,
          message: result?.message || "Could not check for updates.",
          severity: "error",
        });
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleAddMember = async (name, startYear) => {
    try {
      await addTeamMember({ name, start_year: startYear });
      setSnack({ open: true, message: `${name} added to team`, severity: "success" });
      setAddDialogOpen(false);
      load();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || "Error adding member", severity: "error" });
    }
  };

  const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const fileName = filePath ? filePath.split("/").pop() : "No file selected";

  const q = search.trim().toLowerCase();
  const visibleTeam = q ? team.filter((m) => m.name.toLowerCase().includes(q)) : team;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Settings</Typography>

      {/* Data File */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontSize: "1rem" }}>
          <InsertDriveFileIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: "text-bottom" }} />
          Data File
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The Excel file used as the master data source. All reads and writes go to this file.
        </Typography>
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 2,
            p: 2, border: "1px solid #e0e0e0", borderRadius: 1, bgcolor: "#fafafa",
          }}
        >
          <DescriptionIcon sx={{ color: "#1a73e8", fontSize: 32 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" fontWeight={500} noWrap>
              {fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {filePath || "Using default location"}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={async () => {
              if (window.electronAPI?.selectExcelFile) {
                const picked = await window.electronAPI.selectExcelFile(filePath);
                if (picked) handleFileSelect(picked);
              } else {
                setBrowseOpen(true);
              }
            }}
          >
            Change
          </Button>
        </Box>
      </Paper>

      {/* Vacation Policy */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontSize: "1rem" }}>Vacation Policy</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
          <TextField
            label="Base vacation days / year"
            type="number"
            value={baseDays}
            onChange={(e) => setBaseDays(e.target.value)}
            size="small"
            helperText=" "
            sx={{ width: 200 }}
          />
          <TextField
            label="Accrual per month"
            type="number"
            value={accrual}
            onChange={(e) => setAccrual(e.target.value)}
            size="small"
            inputProps={{ step: 0.0001 }}
            helperText=" "
            sx={{ width: 200 }}
          />
          <TextField
            label="Carry-over deadline month"
            type="number"
            value={carryover}
            onChange={(e) => setCarryover(e.target.value)}
            size="small"
            helperText={carryover ? `Until end of ${MONTH_NAMES[parseInt(carryover)] || ""}` : " "}
            sx={{ width: 200 }}
          />
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveConfig}
            sx={{ mt: "8px", height: 40 }}
          >
            Save
          </Button>
        </Box>
      </Paper>

      {/* Team Management */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>Team Members</Typography>
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={() => setAddDialogOpen(true)}
            size="small"
          >
            Add Member
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Start Year</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleTeam.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No team members matching “{search}”
                  </TableCell>
                </TableRow>
              ) : visibleTeam.map((m) => (
                <TableRow key={m.name} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{m.name}</Typography>
                  </TableCell>
                  <TableCell>{m.start_year}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ color: m.end_year ? "error.main" : "success.main", fontWeight: 500 }}
                    >
                      {m.end_year ? `Left (${m.end_year})` : "Active"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* About */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontSize: "1rem" }}>
          <InfoOutlinedIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: "text-bottom" }} />
          About
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box>
            <Typography variant="body1" fontWeight={500}>
              G-Attendance
            </Typography>
            <Typography variant="body2" color="text.secondary">
              v{appVersion.version} (build {appVersion.buildNumber})
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          {isElectron && (
            <Button
              variant="text"
              size="small"
              startIcon={
                checkingUpdate
                  ? <CircularProgress size={16} thickness={5} />
                  : <SystemUpdateIcon />
              }
              onClick={handleCheckForUpdates}
              disabled={checkingUpdate}
              sx={{ textTransform: "none" }}
            >
              {checkingUpdate ? "Checking…" : "Check for updates"}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Dialogs */}
      <FileBrowserDialog
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        onSelect={handleFileSelect}
        initialPath={filePath}
      />

      <AddMemberDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSave={handleAddMember}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
