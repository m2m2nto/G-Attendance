import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Fab, IconButton, Snackbar, Alert, Chip, FormControl,
  InputLabel, Select, MenuItem, Tooltip, TableSortLabel,
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

function parseDateDetails(detail) {
  if (!detail) return [];
  const parts = detail.split(",").map((s) => s.trim()).filter(Boolean);
  const result = [];
  for (const part of parts) {
    const half = part.includes("(1/2)");
    const clean = part.replace("(1/2)", "").trim();
    const rangeMatch = clean.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      for (let d = start; d <= end; d++) {
        result.push({ day: d, half: false });
      }
    } else {
      const dayNum = parseInt(clean);
      if (!isNaN(dayNum)) {
        result.push({ day: dayNum, half });
      }
    }
  }
  return result;
}

function DateChips({ detail, month }) {
  const dates = parseDateDetails(detail);
  if (dates.length === 0) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const monthAbbr = MONTHS[month]?.substring(0, 3) || "";
  return (
    <Box sx={{ display: "flex", gap: 0.4, flexWrap: "wrap" }}>
      {dates.map((d, i) => (
        <Chip
          key={i}
          label={`${d.day}${d.half ? "½" : ""}`}
          size="small"
          variant={d.half ? "outlined" : "filled"}
          sx={{
            height: 22,
            fontSize: "0.75rem",
            fontWeight: 600,
            minWidth: 28,
            "& .MuiChip-label": { px: 0.6 },
            ...(d.half
              ? { borderColor: "#1a73e8", color: "#1a73e8" }
              : { bgcolor: "#e8f0fe", color: "#1a73e8" }),
          }}
        />
      ))}
    </Box>
  );
}

const COLUMNS = [
  { id: "name", label: "Person", align: "left" },
  { id: "month", label: "Month", align: "left" },
  { id: "days_count", label: "Days", align: "right" },
  { id: "dates_detail", label: "Date Details", align: "left", sortable: false },
  { id: "updated_at", label: "Last Updated", align: "left" },
];

function descendingComparator(a, b, orderBy) {
  const va = a[orderBy] ?? "";
  const vb = b[orderBy] ?? "";
  if (vb < va) return -1;
  if (vb > va) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export default function VacationPage({ year, onDataChange }) {
  const [entries, setEntries] = useState([]);
  const [team, setTeam] = useState([]);
  const [filterName, setFilterName] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("month");

  const load = () => {
    const params = { year };
    if (filterName !== "all") params.name = filterName;
    if (filterMonth !== "all") params.month = filterMonth;
    Promise.all([getLeave("vacation", params), getTeam()]).then(([data, t]) => {
      setEntries(data);
      setTeam(t.filter((m) => !m.end_year));
    });
  };

  useEffect(load, [year, filterName, filterMonth]);

  const handleSort = (columnId) => {
    const isAsc = orderBy === columnId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(columnId);
  };

  const sortedEntries = useMemo(
    () => [...entries].sort(getComparator(order, orderBy)),
    [entries, order, orderBy],
  );

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

  const totalDays = useMemo(
    () => entries.reduce((sum, e) => sum + (e.days_count || 0), 0),
    [entries],
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
          <Typography variant="h5">
            Vacation <Typography component="span" color="text.secondary" sx={{ fontSize: "1rem" }}>({year})</Typography>
          </Typography>
          {entries.length > 0 && (
            <Chip
              label={`${totalDays} day${totalDays !== 1 ? "s" : ""} total`}
              size="small"
              sx={{ bgcolor: "#e8f0fe", color: "#1a73e8", fontWeight: 600 }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Person</InputLabel>
            <Select value={filterName} onChange={(e) => setFilterName(e.target.value)} label="Person">
              <MenuItem value="all">All members</MenuItem>
              {team.map((m) => (
                <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Month</InputLabel>
            <Select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} label="Month">
              <MenuItem value="all">All months</MenuItem>
              {MONTHS.slice(1).map((m, i) => (
                <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell key={col.id} align={col.align} sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
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
              <TableCell align="right" width={100} sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 1} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No vacation entries{filterName !== "all" || filterMonth !== "all" ? " matching filters" : ""} for {year}
                </TableCell>
              </TableRow>
            ) : (
              sortedEntries.map((e) => (
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
                    <DateChips detail={e.dates_detail} month={e.month} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                      {e.updated_at || "\u2014"}
                    </Typography>
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
