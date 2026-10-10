import React, { useEffect, useRef, useState } from "react";
import {
  Box, Typography, Paper, TextField, Button, Chip, MenuItem, Switch,
  FormControlLabel,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import { getRecapSettings, updateRecapSettings } from "../api/client";

const FREQUENCIES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function RecapSettings({ team, onNotify }) {
  const [settings, setSettings] = useState(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [frequency, setFrequency] = useState(3);
  const [excluded, setExcluded] = useState([]);
  const bodyRef = useRef(null);

  useEffect(() => {
    getRecapSettings().then((s) => {
      setSettings(s);
      setSubject(s.subject_template);
      setBody(s.body_template);
      setFrequency(s.frequency_months);
      setExcluded(s.excluded_members);
    });
  }, []);

  if (!settings) return null;

  const activeMembers = team.filter((m) => !m.end_year);

  const insertPlaceholder = (name) => {
    const token = `{${name}}`;
    const el = bodyRef.current;
    const start = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const toggleMember = (name) => {
    setExcluded((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const handleReset = () => {
    setSubject(settings.defaults.subject);
    setBody(settings.defaults.body);
  };

  const handleSave = async () => {
    try {
      const saved = await updateRecapSettings({
        subject_template: subject,
        body_template: body,
        frequency_months: frequency,
        excluded_members: excluded,
      });
      setSettings(saved);
      onNotify("Recap settings saved", "success");
    } catch (err) {
      onNotify(err.response?.data?.error || "Error saving recap settings", "error");
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontSize: "1rem" }}>
        <MailOutlineIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: "text-bottom" }} />
        Recap email
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Italian template used to generate each team member's vacation and sick leave recap.
      </Typography>

      <TextField
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        inputRef={bodyRef}
        size="small"
        fullWidth
        multiline
        minRows={10}
        sx={{ mb: 1, "& textarea": { fontSize: "0.85rem" } }}
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 3 }}>
        {settings.placeholders.map((p) => (
          <Chip
            key={p}
            label={`{${p}}`}
            size="small"
            variant="outlined"
            onMouseDown={(e) => e.preventDefault()} // keep the body focused and its cursor in place
            onClick={() => insertPlaceholder(p)}
          />
        ))}
      </Box>

      <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "flex-start", mb: 2 }}>
        <TextField
          select
          label="Reminder every"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          size="small"
          sx={{ width: 200 }}
        >
          {FREQUENCIES.map((n) => (
            <MenuItem key={n} value={n}>{n === 1 ? "1 month" : `${n} months`}</MenuItem>
          ))}
        </TextField>

        <Box>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>Include in recap</Typography>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {activeMembers.map((m) => (
              <FormControlLabel
                key={m.name}
                control={
                  <Switch size="small" checked={!excluded.includes(m.name)} onChange={() => toggleMember(m.name)} />
                }
                label={<Typography variant="body2">{m.name}</Typography>}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button onClick={handleReset}>Reset to default</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>Save</Button>
      </Box>
    </Paper>
  );
}
