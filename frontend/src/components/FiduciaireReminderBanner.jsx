import React from "react";
import { Box, Typography, Button } from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import dayjs from "dayjs";

export default function FiduciaireReminderBanner({ status, onOpenSickLeave, onLater }) {
  if (!status?.is_due) return null;

  const items = status.pending.map((p) => {
    const month = dayjs(`${p.year}-${String(p.month).padStart(2, "0")}-01`).format("MMMM");
    const when = p.overdue ? "overdue" : `by ${dayjs(p.deadline).format("DD/MM")}`;
    return `${p.name} (${month}, ${when})`;
  });
  const overdue = status.pending.some((p) => p.overdue);

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 1,
        bgcolor: overdue ? "#fce8e6" : "#fef7e0",
        border: `1px solid ${overdue ? "#f6aea9" : "#f9e1a0"}`,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <LocalHospitalIcon sx={{ color: overdue ? "#d93025" : "#e37400", fontSize: 22 }} />
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
        Send the sick leave documents to the fiduciaire — {items.join(", ")}
      </Typography>
      <Button onClick={onLater} size="small" sx={{ textTransform: "none", fontSize: "0.8rem" }}>
        Later
      </Button>
      <Button
        variant="contained"
        size="small"
        onClick={onOpenSickLeave}
        sx={{ textTransform: "none", fontSize: "0.8rem" }}
      >
        Open sick leave
      </Button>
    </Box>
  );
}
