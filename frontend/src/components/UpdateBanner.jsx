import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, IconButton, LinearProgress,
} from "@mui/material";
import SystemUpdateIcon from "@mui/icons-material/SystemUpdate";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";

const isElectron =
  typeof window !== "undefined" && !!window.electronAPI?.onUpdateAvailable;

export default function UpdateBanner() {
  const [state, setState] = useState(null); // null | 'available' | 'downloading' | 'ready'
  const [info, setInfo] = useState(null);
  const [progress, setProgress] = useState({ percent: 0, downloaded: 0, total: 0 });

  useEffect(() => {
    if (!isElectron) return;

    window.electronAPI.onUpdateAvailable((data) => {
      setInfo(data);
      setState("available");
    });

    window.electronAPI.onUpdateProgress((data) => {
      setProgress(data);
      setState("downloading");
    });

    window.electronAPI.onUpdateDownloaded((data) => {
      setInfo((prev) => ({ ...prev, ...data }));
      setState("ready");
    });

    window.electronAPI.onUpdateError(() => {
      setState(null);
    });

    return () => window.electronAPI.removeUpdateListeners();
  }, []);

  if (!state || !isElectron) return null;

  const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

  if (state === "available") {
    return (
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 1,
          bgcolor: "#e8f0fe",
          border: "1px solid #c2d7f4",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <SystemUpdateIcon sx={{ color: "#1a73e8", fontSize: 22 }} />
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
          Update available: v{info.version} (build {info.buildNumber})
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            setState("downloading");
            window.electronAPI.downloadUpdate();
          }}
          sx={{ textTransform: "none", fontSize: "0.8rem" }}
        >
          Update Now
        </Button>
        <IconButton size="small" onClick={() => setState(null)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  if (state === "downloading") {
    return (
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 1,
          bgcolor: "#e8f0fe",
          border: "1px solid #c2d7f4",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
            Downloading update…
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {progress.percent}% — {formatMB(progress.downloaded)} / {formatMB(progress.total)} MB
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress.percent}
          sx={{ borderRadius: 1, height: 6 }}
        />
      </Box>
    );
  }

  if (state === "ready") {
    return (
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 1,
          bgcolor: "#e6f4ea",
          border: "1px solid #a8dab5",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <CheckCircleIcon sx={{ color: "#1e8e3e", fontSize: 22 }} />
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
          Update ready — v{info.version} (build {info.buildNumber})
        </Typography>
        <Button
          variant="contained"
          size="small"
          color="success"
          onClick={() => window.electronAPI.applyUpdate()}
          sx={{ textTransform: "none", fontSize: "0.8rem" }}
        >
          Restart Now
        </Button>
      </Box>
    );
  }

  return null;
}
