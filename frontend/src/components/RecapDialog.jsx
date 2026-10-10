import React, { useEffect, useState } from "react";
import {
  Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  List, ListItemButton, ListItemText, TextField, CircularProgress, Snackbar, Alert,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import dayjs from "dayjs";
import { getRecap, markRecapSent } from "../api/client";

export default function RecapDialog({ open, onClose, onSent }) {
  const [recaps, setRecaps] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(0);
    getRecap()
      .then(setRecaps)
      .catch((err) => setSnack({
        open: true, message: err.response?.data?.error || "Could not load recaps", severity: "error",
      }))
      .finally(() => setLoading(false));
  }, [open]);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnack({ open: true, message: `${label} copied`, severity: "success" });
    } catch {
      setSnack({ open: true, message: "Could not copy to clipboard", severity: "error" });
    }
  };

  const handleMarkSent = async () => {
    try {
      const status = await markRecapSent();
      onSent(status);
      setSnack({
        open: true,
        message: `Marked as sent — next reminder on ${dayjs(status.next_due).format("DD/MM/YYYY")}`,
        severity: "success",
      });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || "Could not mark as sent", severity: "error" });
    }
  };

  const recap = recaps[selected];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Recap email ({new Date().getFullYear()})</DialogTitle>
      <DialogContent dividers sx={{ p: 0, display: "flex", minHeight: 480 }}>
        {loading ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : recaps.length === 0 ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography color="text.secondary">No team members included in the recap.</Typography>
          </Box>
        ) : (
          <>
            <List dense sx={{ width: 180, borderRight: 1, borderColor: "divider", flexShrink: 0 }}>
              {recaps.map((r, i) => (
                <ListItemButton key={r.name} selected={i === selected} onClick={() => setSelected(i)}>
                  <ListItemText primary={r.name} primaryTypographyProps={{ fontSize: "0.9rem" }} />
                </ListItemButton>
              ))}
            </List>
            <Box sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
              {recap.template_error && (
                <Alert severity="warning">
                  The template has a formatting error (check the braces in Settings); showing it unrendered.
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <TextField label="Subject" value={recap.subject} size="small" fullWidth InputProps={{ readOnly: true }} />
                <Button startIcon={<ContentCopyIcon />} onClick={() => copy(recap.subject, "Subject")} sx={{ flexShrink: 0, height: 40 }}>
                  Copy
                </Button>
              </Box>
              <TextField
                label="Body"
                value={recap.body}
                size="small"
                fullWidth
                multiline
                minRows={16}
                maxRows={16}
                InputProps={{ readOnly: true }}
                sx={{ "& textarea": { fontSize: "0.85rem" } }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={() => copy(recap.body, "Body")}>
                  Copy body
                </Button>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleMarkSent} disabled={loading || recaps.length === 0}>Mark as sent</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <Snackbar
        open={snack.open}
        autoHideDuration={2000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
