import React, { useEffect, useState } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Fab, IconButton, Snackbar, Alert, Chip, FormControl,
  InputLabel, Select, MenuItem, Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getLeave, addLeave, updateLeave, deleteLeave, getTeam } from "../api/client";
import LeaveDialog from "./LeaveDialog";
import ConfirmDialog from "./ConfirmDialog";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function VacationPage({ year, onDataChange }) {
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
    Promise.all([getLeave("vacation", params), getTeam()]).then(([data, t]) => {
      setEntries(data);
      setTeam(t.filter((m) => !m.end_year));
    });
  };

  useEffect(load, [year, filterName]);

  const handleSave = async (entries) => {
    try {
      if (editEntry) {
        await updateLeave("vacation", editEntry.name, editEntry.year, editEntry.month, entries[0]);
        setSnack({ open: true, message: "Vacation entry updated", severity: "success" });
      } else {
        for (const e of entries) { await addLeave("vacation", e); }
        const totalDays = entries.reduce((s, e) => s + e.days_count, 0);
        setSnack({ open: true, message: `Vacation: ${totalDays} day${totalDays !== 1 ? "s" : ""} added`, severity: "success" });
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
    await deleteLeave("vacation", deleteTarget.name, deleteTarget.year, deleteTarget.month);
    setSnack({ open: true, message: "Vacation entry deleted", severity: "success" });
    setDeleteTarget(null);
    load();
    onDataChange?.();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5">
          Vacation <Typography component="span" color="text.secondary" sx={{ fontSize: "1rem" }}>({year})</Typography>
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
              <TableCell align="right" width={100}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No vacation entries for {year}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
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
                      sx={{ bgcolor: "#e8f0fe", color: "#1a73e8", fontWeight: 600, minWidth: 40 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{e.dates_detail}</Typography>
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
        leaveType="vacation"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete vacation entry"
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
