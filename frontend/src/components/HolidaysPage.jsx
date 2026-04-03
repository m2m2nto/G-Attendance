import React, { useEffect, useState } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Fab, IconButton, Snackbar, Alert, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import { getHolidays, addHolidayEntry, updateHolidayEntry, deleteHolidayEntry } from "../api/client";
import ConfirmDialog from "./ConfirmDialog";

function HolidayDialog({ open, onClose, onSave, entry, year }) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const isEdit = !!entry;

  useEffect(() => {
    if (entry) {
      setDate(entry.date || "");
      setName(entry.name || "");
    } else {
      setDate(`${year}-01-01`);
      setName("");
    }
  }, [entry, year, open]);

  const handleSave = () => {
    if (!date || !name) return;
    onSave({ date, name, year });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit Holiday" : "New Holiday"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Holiday Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Christmas Day"
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!date || !name}>
          {isEdit ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function getDayOfWeek(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short" });
  } catch {
    return "";
  }
}

function isWeekend(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    return day === 0 || day === 6;
  } catch {
    return false;
  }
}

export default function HolidaysPage({ year }) {
  const [holidays, setHolidays] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  const load = () => {
    getHolidays({ year }).then(setHolidays);
  };

  useEffect(load, [year]);

  const handleSave = async (data) => {
    try {
      if (editEntry) {
        await updateHolidayEntry(editEntry.date, editEntry.year, data);
        setSnack({ open: true, message: "Holiday updated", severity: "success" });
      } else {
        await addHolidayEntry(data);
        setSnack({ open: true, message: "Holiday added", severity: "success" });
      }
      setDialogOpen(false);
      setEditEntry(null);
      load();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || "Error saving", severity: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteHolidayEntry(deleteTarget.date, deleteTarget.year);
    setSnack({ open: true, message: "Holiday deleted", severity: "success" });
    setDeleteTarget(null);
    load();
  };

  const weekendCount = holidays.filter((h) => isWeekend(h.date)).length;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5">
            Public Holidays <Typography component="span" color="text.secondary" sx={{ fontSize: "1rem" }}>({year})</Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {holidays.length} holidays total, {weekendCount} on weekends
          </Typography>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Day</TableCell>
              <TableCell>Holiday</TableCell>
              <TableCell align="center">Weekend</TableCell>
              <TableCell align="right" width={100}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No holidays for {year}
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h) => {
                const weekend = isWeekend(h.date);
                return (
                  <TableRow
                    key={h.date}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "#f6f8fc" },
                      opacity: weekend ? 0.6 : 1,
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <EventIcon sx={{ fontSize: 18, color: "primary.main" }} />
                        <Typography variant="body2" fontWeight={500}>
                          {new Date(h.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{getDayOfWeek(h.date)}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell align="center">
                      {weekend && <Chip size="small" label="Weekend" sx={{ bgcolor: "#fef7e0", color: "#f9ab00", fontWeight: 500 }} />}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditEntry(h); setDialogOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteTarget(h)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
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

      <HolidayDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        entry={editEntry}
        year={year}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete holiday"
        message={deleteTarget ? `Delete "${deleteTarget.name}"?` : ""}
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
