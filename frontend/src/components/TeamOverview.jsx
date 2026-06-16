import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Typography, LinearProgress, Grid, Chip, Skeleton,
  Avatar, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import EventIcon from "@mui/icons-material/Event";
import { computeBalances, getLeave, addLeave } from "../api/client";
import LeaveDialog from "./LeaveDialog";

const COLORS = ["#1a73e8", "#e8710a", "#1e8e3e", "#a142f4", "#d93025"];
const MEMBER_ORDER = ["Danilo", "Ottavio", "Daniele", "Andrei", "Davide"];
const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MemberDetailDialog({ open, onClose, member, year, colorIdx }) {
  const [loading, setLoading] = useState(false);
  const [vacation, setVacation] = useState([]);
  const [sick, setSick] = useState([]);

  useEffect(() => {
    if (!open || !member) return;
    setLoading(true);
    Promise.all([
      getLeave("vacation", { year, name: member.name }),
      getLeave("sick_leave", { year, name: member.name }),
    ])
      .then(([v, s]) => { setVacation(v); setSick(s); })
      .finally(() => setLoading(false));
  }, [open, member, year]);

  if (!member) return null;

  const color = COLORS[colorIdx % COLORS.length];
  const sum = (entries) => entries.reduce((s, e) => s + (e.days_count || 0), 0);

  const renderEntries = (entries, emptyText, chipSx) =>
    entries.length === 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{emptyText}</Typography>
    ) : (
      [...entries].sort((a, b) => a.month - b.month).map((e) => (
        <Box
          key={e.month}
          sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Typography variant="body2" sx={{ width: 90, fontWeight: 500 }}>{MONTHS[e.month]}</Typography>
          <Chip size="small" label={`${e.days_count} d`} sx={{ ...chipSx, fontWeight: 600, minWidth: 44 }} />
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{e.dates_detail || "—"}</Typography>
        </Box>
      ))
    );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar sx={{ bgcolor: color, width: 40, height: 40 }}>{member.name.charAt(0)}</Avatar>
        <Box>
          <Typography sx={{ fontWeight: 600 }}>{member.name}</Typography>
          <Typography variant="body2" color="text.secondary">General status · {year}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
              <Chip icon={<BeachAccessIcon sx={{ fontSize: 14 }} />} label={`${member.used} used`} sx={{ bgcolor: "#e8f0fe", color: "#1a73e8", fontWeight: 500 }} />
              <Chip label={`${member.remaining.toFixed(1)} remaining`} sx={{ bgcolor: "#e6f4ea", color: "#1e8e3e", fontWeight: 500 }} />
              <Chip label={`${(member.total || 0).toFixed(1)} total`} variant="outlined" />
              {member.carried_over > 0 && (
                <Chip label={`${member.carried_over.toFixed(1)} carried over`} variant="outlined" />
              )}
            </Box>

            <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <BeachAccessIcon sx={{ fontSize: 18, color: "#1a73e8" }} /> Vacation — {sum(vacation)} day{sum(vacation) !== 1 ? "s" : ""}
            </Typography>
            <Box sx={{ mb: 2.5 }}>
              {renderEntries(vacation, "No vacation recorded this year", { bgcolor: "#e8f0fe", color: "#1a73e8" })}
            </Box>

            <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <LocalHospitalIcon sx={{ fontSize: 18, color: "#d93025" }} /> Sick leave — {sum(sick)} day{sum(sick) !== 1 ? "s" : ""}
            </Typography>
            <Box>
              {renderEntries(sick, "No sick leave recorded this year", { bgcolor: "#fce8e6", color: "#d93025" })}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function MemberCard({ member, sickDays, colorIdx, onAdd, onView }) {
  const color = COLORS[colorIdx % COLORS.length];
  const total = member.total || 0;
  const usedPct = total > 0 ? Math.min((member.used / total) * 100, 100) : 0;
  const [menuAnchor, setMenuAnchor] = useState(null);

  return (
    <Card
      onClick={onView}
      sx={{ height: "100%", cursor: "pointer", "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }, transition: "box-shadow 0.2s" }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: color, mr: 2, width: 44, height: 44, fontSize: "1.1rem" }}>
            {member.name.charAt(0)}
          </Avatar>
          <Typography variant="h6" sx={{ fontSize: "1.1rem", flex: 1 }}>{member.name}</Typography>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
            sx={{ bgcolor: "#f1f3f4", "&:hover": { bgcolor: "#e8eaed" } }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => { setMenuAnchor(null); onAdd(member.name, "vacation"); }}>
              <ListItemIcon><BeachAccessIcon fontSize="small" sx={{ color: "#1a73e8" }} /></ListItemIcon>
              <ListItemText>Vacation</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); onAdd(member.name, "sick_leave"); }}>
              <ListItemIcon><LocalHospitalIcon fontSize="small" sx={{ color: "#d93025" }} /></ListItemIcon>
              <ListItemText>Sick Leave</ListItemText>
            </MenuItem>
          </Menu>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              <BeachAccessIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: "text-bottom" }} />
              Vacation used
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {member.used} / {total.toFixed(1)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={usedPct}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "#e8eaed",
              "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            size="small"
            icon={<BeachAccessIcon sx={{ fontSize: 14 }} />}
            label={`${member.remaining.toFixed(1)} remaining`}
            sx={{ bgcolor: "#e8f0fe", color: "#1a73e8", fontWeight: 500 }}
          />
          <Chip
            size="small"
            icon={<LocalHospitalIcon sx={{ fontSize: 14 }} />}
            label={`${sickDays} sick days`}
            sx={{ bgcolor: "#fce8e6", color: "#d93025", fontWeight: 500 }}
          />
          {member.carried_over > 0 && (
            <Chip
              size="small"
              label={`${member.carried_over.toFixed(1)} carried over`}
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TeamOverview({ year, onDataChange, search = "" }) {
  const [members, setMembers] = useState([]);
  const [sickByPerson, setSickByPerson] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLeaveType, setDialogLeaveType] = useState("vacation");
  const [dialogName, setDialogName] = useState("");
  const [detail, setDetail] = useState(null); // { member, colorIdx }
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      computeBalances({ year }),
      getLeave("sick_leave", { year }),
    ]).then(([balances, sickEntries]) => {
      const sorted = [...balances].sort((a, b) => {
        const ai = MEMBER_ORDER.indexOf(a.name);
        const bi = MEMBER_ORDER.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      setMembers(sorted);
      const sickMap = {};
      sickEntries.forEach((e) => {
        sickMap[e.name] = (sickMap[e.name] || 0) + (e.days_count || 0);
      });
      setSickByPerson(sickMap);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [year]);

  const handleAdd = (name, leaveType) => {
    setDialogName(name);
    setDialogLeaveType(leaveType);
    setDialogOpen(true);
  };

  const handleSave = async (entries) => {
    try {
      // Write entries sequentially to avoid concurrent Excel file access
      for (const e of entries) {
        await addLeave(dialogLeaveType, e);
      }
      setDialogOpen(false);
      const label = dialogLeaveType === "vacation" ? "Vacation" : "Sick leave";
      const totalDays = entries.reduce((s, e) => s + e.days_count, 0);
      setSnack({ open: true, message: `${label} added: ${totalDays} day${totalDays !== 1 ? "s" : ""} for ${entries[0].name}`, severity: "success" });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save";
      setSnack({ open: true, message: msg, severity: "error" });
    }
  };

  const q = search.trim().toLowerCase();
  const visibleMembers = members
    .map((member, i) => ({ member, i }))
    .filter(({ member }) => !q || member.name.toLowerCase().includes(q));

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>Team Overview</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Grid key={i} item xs={12} sm={6} md={4}>
              <Skeleton variant="rounded" height={180} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Team Overview <Typography component="span" color="text.secondary" sx={{ fontSize: "1rem" }}>({year})</Typography>
      </Typography>
      {members.length > 0 && members[0].weekend_holidays > 0 && (
        <Chip
          icon={<EventIcon sx={{ fontSize: 16 }} />}
          label={`+${members[0].weekend_holidays} public holidays falling on weekends this year`}
          variant="outlined"
          sx={{ mb: 2, fontSize: "0.85rem" }}
        />
      )}
      <Grid container spacing={3}>
        {visibleMembers.length === 0 ? (
          <Grid item xs={12}>
            <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No team members matching “{search}”
            </Typography>
          </Grid>
        ) : (
          visibleMembers.map(({ member, i }) => (
            <Grid key={member.name} item xs={12} sm={6} md={4}>
              <MemberCard
                member={member}
                sickDays={sickByPerson[member.name] || 0}
                colorIdx={i}
                onAdd={handleAdd}
                onView={() => setDetail({ member, colorIdx: i })}
              />
            </Grid>
          ))
        )}
      </Grid>
      <MemberDetailDialog
        open={!!detail}
        onClose={() => setDetail(null)}
        member={detail?.member}
        colorIdx={detail?.colorIdx ?? 0}
        year={year}
      />
      <LeaveDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        entry={null}
        team={[
          { name: dialogName },
          ...members.filter((m) => m.name !== dialogName).map((m) => ({ name: m.name })),
        ]}
        year={year}
        leaveType={dialogLeaveType}
      />
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
