import React, { useEffect, useState } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Fab, IconButton, Snackbar, Alert, Chip, FormControl,
  InputLabel, Select, MenuItem, Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckIcon from "@mui/icons-material/Check";
import {
  getLeave, addLeave, updateLeave, deleteLeave, getTeam,
  selectSickLeaveAttachments, openSickLeaveAttachment, removeSickLeaveAttachment, setSickLeaveSent,
} from "../api/client";
import LeaveDialog from "./LeaveDialog";
import ConfirmDialog from "./ConfirmDialog";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SickLeavePage({ year, onDataChange, search = "" }) {
  const [entries, setEntries] = useState([]);
  const [team, setTeam] = useState([]);
  const [filterName, setFilterName] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  const load = () => {
    const params = { year };
    if (filterName !== "all") params.name = filterName;
    Promise.all([getLeave("sick_leave", params), getTeam()]).then(([data, t]) => {
      setEntries(data);
      setTeam(t.filter((m) => !m.end_year));
    });
  };

  useEffect(load, [year, filterName]);

  const handleSave = async (entries) => {
    try {
      if (editEntry) {
        await updateLeave("sick_leave", editEntry.name, editEntry.year, editEntry.month, entries[0]);
        setSnack({ open: true, message: "Sick leave entry updated", severity: "success" });
      } else {
        for (const e of entries) { await addLeave("sick_leave", e); }
        const totalDays = entries.reduce((s, e) => s + e.days_count, 0);
        setSnack({ open: true, message: `Sick leave: ${totalDays} day${totalDays !== 1 ? "s" : ""} added`, severity: "success" });
      }
      setDialogOpen(false);
      setEditEntry(null);
      load();
      onDataChange?.();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || "Error saving", severity: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteLeave("sick_leave", deleteTarget.name, deleteTarget.year, deleteTarget.month);
    setSnack({ open: true, message: "Sick leave entry deleted", severity: "success" });
    setDeleteTarget(null);
    load();
    onDataChange?.();
  };

  // Run a document action (attach / open / unlink / mark sent), then refresh.
  const docAction = async (action, successMessage) => {
    try {
      const result = await action();
      const message = successMessage?.(result);
      if (message) setSnack({ open: true, message, severity: "success" });
      load();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || "Error updating document", severity: "error" });
    }
  };

  const q = search.trim().toLowerCase();
  const visibleEntries = q
    ? entries.filter((e) =>
        [e.name, MONTHS[e.month], e.dates_detail, String(e.days_count), ...e.attachments.map((a) => a.file_name)]
          .some((v) => (v || "").toLowerCase().includes(q)))
    : entries;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5">
          Sick Leave <Typography component="span" color="text.secondary" sx={{ fontSize: "1rem" }}>({year})</Typography>
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by person</InputLabel>
          <Select value={filterName} onChange={(e) => setFilterName(e.target.value)} label="Filter by person">
            <MenuItem value="all">All members</MenuItem>
            {team.map((m) => (
              <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Person</TableCell>
              <TableCell>Month</TableCell>
              <TableCell align="right">Days</TableCell>
              <TableCell>Date Details</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell align="right" width={100}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No sick leave entries{q ? " matching search" : ""} for {year}
                </TableCell>
              </TableRow>
            ) : (
              visibleEntries.map((e) => (
                <TableRow
                  key={`${e.name}-${e.month}`}
                  hover
                  sx={{ "&:hover": { bgcolor: "#f6f8fc" } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{e.name}</Typography>
                  </TableCell>
                  <TableCell>{MONTHS[e.month]}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      label={e.days_count}
                      sx={{ bgcolor: "#fce8e6", color: "#d93025", fontWeight: 600, minWidth: 40 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{e.dates_detail}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
                      {e.attachments.map((a) => (
                        <Box key={a.path} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Tooltip title={a.missing ? `File missing: ${a.path}` : `Open ${a.path}`}>
                            <Chip
                              size="small"
                              icon={a.missing ? <WarningAmberIcon /> : <VisibilityIcon />}
                              label={a.missing ? `Missing: ${a.file_name}` : a.file_name}
                              color={a.missing ? "error" : "primary"}
                              variant="outlined"
                              onClick={() => docAction(() => openSickLeaveAttachment(e, a.path))}
                              onDelete={() => docAction(() => removeSickLeaveAttachment(e, a.path))}
                              sx={{ maxWidth: 220 }}
                            />
                          </Tooltip>
                          <Tooltip title={a.sent_to_fiduciaire ? "Sent to the fiduciaire — click to undo" : "Click to mark as sent to the fiduciaire"}>
                            <Chip
                              size="small"
                              icon={a.sent_to_fiduciaire ? <CheckIcon /> : undefined}
                              label={a.sent_to_fiduciaire ? "Sent" : "Not sent"}
                              color={a.sent_to_fiduciaire ? "success" : "default"}
                              variant={a.sent_to_fiduciaire ? "filled" : "outlined"}
                              onClick={() => docAction(() => setSickLeaveSent(e, a.path, !a.sent_to_fiduciaire))}
                              sx={a.sent_to_fiduciaire ? undefined : { color: "text.secondary" }}
                            />
                          </Tooltip>
                        </Box>
                      ))}
                      <Tooltip title="Link one or more sick leave documents (files are not copied)">
                        <Chip
                          size="small"
                          icon={<AttachFileIcon />}
                          label="Attach"
                          variant="outlined"
                          onClick={() => docAction(
                            () => selectSickLeaveAttachments(e),
                            (r) => r.added.length > 0 && `Linked ${r.added.join(", ")}`,
                          )}
                          sx={{ color: "text.secondary" }}
                        />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditEntry(e); setDialogOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeleteTarget(e)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Fab
        color="primary"
        sx={{ position: "fixed", bottom: 24, right: 24 }}
        onClick={() => { setEditEntry(null); setDialogOpen(true); }}
      >
        <AddIcon />
      </Fab>

      <LeaveDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        entry={editEntry}
        team={team}
        year={year}
        leaveType="sick_leave"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete sick leave entry"
        message={deleteTarget ? `Delete ${deleteTarget.days_count} day(s) for ${deleteTarget.name} in ${MONTHS[deleteTarget.month]}?` : ""}
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
