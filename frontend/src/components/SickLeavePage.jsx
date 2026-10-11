import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Fab, IconButton, Snackbar, Alert, Chip, FormControl,
  InputLabel, Select, MenuItem, Tooltip, Checkbox, TableSortLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
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

// An entry counts as sent once it has documents and every one is flagged as sent.
const allSent = (e) => e.attachments.length > 0 && e.attachments.every((a) => a.sent_to_fiduciaire);

const COLUMNS = [
  { id: "name", label: "Person", value: (e) => e.name },
  { id: "month", label: "Month", value: (e) => e.month },
  { id: "days_count", label: "Days", align: "right", value: (e) => e.days_count },
  { id: "dates_detail", label: "Date Details", sortable: false },
  { id: "documents", label: "Documents", value: (e) => e.attachments.length },
  { id: "fiduciaire", label: "Fiduciaire", align: "center", value: (e) => (allSent(e) ? 1 : 0) },
];

function getComparator(order, orderBy) {
  const { value } = COLUMNS.find((c) => c.id === orderBy);
  const sign = order === "desc" ? -1 : 1;
  return (a, b) => {
    const va = value(a);
    const vb = value(b);
    return va < vb ? -sign : va > vb ? sign : 0;
  };
}

export default function SickLeavePage({ year, onDataChange, onFiduciaireChange, search = "" }) {
  const [entries, setEntries] = useState([]);
  const [team, setTeam] = useState([]);
  const [filterName, setFilterName] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [order, setOrder] = useState("desc"); // newest first
  const [orderBy, setOrderBy] = useState("month");

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
      onFiduciaireChange?.();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || "Error updating document", severity: "error" });
    }
  };

  const handleSort = (columnId) => {
    const isAsc = orderBy === columnId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(columnId);
  };

  const q = search.trim().toLowerCase();
  const visibleEntries = useMemo(() => {
    const filtered = q
      ? entries.filter((e) =>
          [e.name, MONTHS[e.month], e.dates_detail, String(e.days_count), ...e.attachments.map((a) => a.file_name)]
            .some((v) => (v || "").toLowerCase().includes(q)))
      : entries;
    return [...filtered].sort(getComparator(order, orderBy));
  }, [entries, order, orderBy, q]);

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
              {COLUMNS.map((col) => (
                <TableCell key={col.id} align={col.align}>
                  {col.sortable === false ? (
                    col.label
                  ) : (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : "asc"}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
              <TableCell align="right" width={100}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
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
                        <Tooltip key={a.path} title={a.missing ? `File missing: ${a.path}` : `Open ${a.path}`}>
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
                  <TableCell align="center">
                    {/* One checkbox per file, on the same line as its chip in the Documents column. */}
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                      {e.attachments.map((a) => (
                        <Tooltip key={a.path} title={`${a.file_name}: ${a.sent_to_fiduciaire ? "sent to the fiduciaire" : "not sent to the fiduciaire yet"}`}>
                          <Checkbox
                            size="small"
                            color="success"
                            checked={a.sent_to_fiduciaire}
                            onChange={() => docAction(() => setSickLeaveSent(e, a.path, !a.sent_to_fiduciaire))}
                            sx={{ p: 0, height: 24 }}
                          />
                        </Tooltip>
                      ))}
                      <Box sx={{ height: 24 }} />
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
