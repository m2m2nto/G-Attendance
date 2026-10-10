import React from "react";
import { Box, Typography, Button } from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import dayjs from "dayjs";

export default function RecapReminderBanner({ status, onOpenRecap, onLater }) {
  if (!status?.is_due) return null;

  const lastSent = status.last_sent
    ? `last sent ${dayjs(status.last_sent).format("DD/MM/YYYY")}`
    : "never sent";

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 1,
        bgcolor: "#fef7e0",
        border: "1px solid #f9e1a0",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <MailOutlineIcon sx={{ color: "#e37400", fontSize: 22 }} />
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
        Time to send the vacation recap — {lastSent}
      </Typography>
      <Button onClick={onLater} size="small" sx={{ textTransform: "none", fontSize: "0.8rem" }}>
        Later
      </Button>
      <Button
        variant="contained"
        size="small"
        onClick={onOpenRecap}
        sx={{ textTransform: "none", fontSize: "0.8rem" }}
      >
        Open recap
      </Button>
    </Box>
  );
}
