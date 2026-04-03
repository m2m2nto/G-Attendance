import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  FormControl, InputLabel, Select, MenuItem, Typography, Chip,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import dayjs from "dayjs";
import { getLeave } from "../api/client";

function SelectedDay(props) {
  const { day, selectedDates, existingDates, ...other } = props;
  const key = day.format("YYYY-MM-DD");
  const selected = selectedDates[key];
  const existing = existingDates[key];

  let sx = {};
  if (selected) {
    sx = {
      bgcolor: selected.half ? "#e8f0fe" : "#1a73e8",
      color: selected.half ? "#1a73e8" : "#fff",
      fontWeight: 600,
      border: selected.half ? "2px solid #1a73e8" : "none",
      "&:hover": { bgcolor: selected.half ? "#d2e3fc" : "#1557b0" },
    };
  } else if (existing) {
    sx = {
      bgcolor: existing.half ? "#fef3e8" : "#f9ab00",
      color: existing.half ? "#e8710a" : "#fff",
      fontWeight: 600,
      border: existing.half ? "2px solid #f9ab00" : "none",
      opacity: 0.85,
      cursor: "not-allowed",
      "&:hover": { bgcolor: existing.half ? "#fef3e8" : "#f9ab00" },
    };
  }

  return (
    <PickersDay
      {...other}
      day={day}
      selected={false}
      disabled={other.disabled || !!existing}
      sx={sx}
    />
  );
}

export default function LeaveDialog({ open, onClose, onSave, entry, team, year, leaveType }) {
  const [name, setName] = useState("");
  const [selectedDates, setSelectedDates] = useState({});
  const [existingDates, setExistingDates] = useState({});
  const [calendarMonth, setCalendarMonth] = useState(dayjs().year(year).month(new Date().getMonth()));

  const isEdit = !!entry && !!entry.month;

  // Load existing leave entries for the selected person
  const loadExisting = useCallback(async (personName) => {
    if (!personName || !year) {
      setExistingDates({});
      return;
    }
    try {
      // Load both vacation and sick leave for this person
      const [vacation, sick] = await Promise.all([
        getLeave("vacation", { year, name: personName }),
        getLeave("sick_leave", { year, name: personName }),
      ]);
      const dates = {};
      const parseEntries = (entries, type) => {
        entries.forEach((e) => {
          if (!e.dates_detail) return;
          e.dates_detail.split(",").map((s) => s.trim()).filter(Boolean).forEach((part) => {
            const half = part.includes("(1/2)");
            const dayNum = parseInt(part.replace("(1/2)", "").trim());
            if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
              const d = dayjs().year(year).month(e.month - 1).date(dayNum);
              const key = d.format("YYYY-MM-DD");
              dates[key] = { half, type };
            }
          });
        });
      };
      parseEntries(vacation, "vacation");
      parseEntries(sick, "sick_leave");

      // If editing, remove the dates from the entry being edited so they're selectable
      if (isEdit && entry) {
        if (entry.dates_detail) {
          entry.dates_detail.split(",").map((s) => s.trim()).filter(Boolean).forEach((part) => {
            const dayNum = parseInt(part.replace("(1/2)", "").trim());
            if (!isNaN(dayNum)) {
              const d = dayjs().year(year).month(entry.month - 1).date(dayNum);
              delete dates[d.format("YYYY-MM-DD")];
            }
          });
        }
      }
      setExistingDates(dates);
    } catch {
      setExistingDates({});
    }
  }, [year, isEdit, entry]);

  useEffect(() => {
    if (!open) return;
    if (entry && entry.month) {
      setName(entry.name || "");
      setCalendarMonth(dayjs().year(year).month(entry.month - 1));
      const dates = {};
      if (entry.dates_detail) {
        entry.dates_detail.split(",").map((s) => s.trim()).filter(Boolean).forEach((part) => {
          const half = part.includes("(1/2)");
          const dayNum = parseInt(part.replace("(1/2)", "").trim());
          if (!isNaN(dayNum)) {
            const d = dayjs().year(year).month(entry.month - 1).date(dayNum);
            dates[d.format("YYYY-MM-DD")] = { half };
          }
        });
      }
      setSelectedDates(dates);
      loadExisting(entry.name);
    } else {
      const initialName = team?.[0]?.name || "";
      setName(initialName);
      setCalendarMonth(dayjs().year(year).month(new Date().getMonth()));
      setSelectedDates({});
      loadExisting(initialName);
    }
  }, [entry, team, open, year, loadExisting]);

  // Reload existing dates when the person changes
  const handleNameChange = (newName) => {
    setName(newName);
    setSelectedDates({});
    loadExisting(newName);
  };

  const handleDayClick = (date) => {
    const key = date.format("YYYY-MM-DD");
    if (existingDates[key]) return; // Already taken — don't allow selection
    setSelectedDates((prev) => {
      const next = { ...prev };
      if (next[key]) {
        if (!next[key].half) {
          next[key] = { half: true };
        } else {
          delete next[key];
        }
      } else {
        next[key] = { half: false };
      }
      return next;
    });
  };

  const sortedDates = useMemo(
    () => Object.entries(selectedDates).sort(([a], [b]) => a.localeCompare(b)),
    [selectedDates],
  );

  const totalDays = useMemo(
    () => sortedDates.reduce((sum, [, v]) => sum + (v.half ? 0.5 : 1), 0),
    [sortedDates],
  );

  const buildEntries = () => {
    const byMonth = {};
    sortedDates.forEach(([dateStr, val]) => {
      const d = dayjs(dateStr);
      const m = d.month() + 1;
      if (!byMonth[m]) byMonth[m] = [];
      const dayNum = d.date();
      byMonth[m].push({ dayNum, half: val.half });
    });
    return Object.entries(byMonth).map(([month, days]) => ({
      name,
      year,
      month: parseInt(month),
      days_count: days.reduce((s, d) => s + (d.half ? 0.5 : 1), 0),
      dates_detail: days.map((d) => d.half ? `${d.dayNum}(1/2)` : `${d.dayNum}`).join(", "),
    }));
  };

  const handleSave = () => {
    if (!name || sortedDates.length === 0) return;
    onSave(buildEntries());
  };

  const typeLabel = leaveType === "vacation" ? "Vacation" : "Sick Leave";
  const hasExisting = Object.keys(existingDates).length > 0;

  const shouldDisableDate = (date) => {
    const day = date.day();
    return day === 0 || day === 6;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? `Edit ${typeLabel}` : `New ${typeLabel}`}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Team Member</InputLabel>
              <Select
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                label="Team Member"
                disabled={isEdit}
              >
                {(team || []).map((m) => (
                  <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mx: -1 }}>
              <DateCalendar
                value={null}
                onChange={handleDayClick}
                onMonthChange={(date) => setCalendarMonth(date)}
                defaultCalendarMonth={calendarMonth}
                shouldDisableDate={shouldDisableDate}
                slots={{ day: SelectedDay }}
                slotProps={{ day: { selectedDates, existingDates } }}
                views={["day"]}
                minDate={dayjs().year(year).month(0).date(1)}
                maxDate={dayjs().year(year).month(11).date(31)}
              />
            </Box>

            <Box sx={{ mx: 1 }}>
              <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Click: full day &bull; Again: half day &bull; Again: deselect
                </Typography>
              </Box>
              {hasExisting && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#f9ab00" }} />
                  <Typography variant="caption" color="text.secondary">
                    Already taken (vacation or sick leave)
                  </Typography>
                </Box>
              )}
              {sortedDates.length > 0 ? (
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
                  {sortedDates.map(([dateStr, val]) => {
                    const d = dayjs(dateStr);
                    return (
                      <Chip
                        key={dateStr}
                        label={`${d.format("D MMM")}${val.half ? " (½)" : ""}`}
                        size="small"
                        onDelete={() => {
                          setSelectedDates((prev) => {
                            const next = { ...prev };
                            delete next[dateStr];
                            return next;
                          });
                        }}
                        sx={{
                          bgcolor: val.half ? "#e8f0fe" : "#1a73e8",
                          color: val.half ? "#1a73e8" : "#fff",
                          fontWeight: 500,
                          "& .MuiChip-deleteIcon": { color: val.half ? "#1a73e8" : "#fff" },
                        }}
                      />
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No dates selected
                </Typography>
              )}
              {totalDays > 0 && (
                <Typography variant="body2" fontWeight={600} sx={{ mt: 1.5 }}>
                  Total: {totalDays} {totalDays === 1 ? "day" : "days"}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="secondary">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!name || sortedDates.length === 0}>
            {isEdit ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
