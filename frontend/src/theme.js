import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1a73e8",
      light: "#4791db",
      dark: "#1557b0",
    },
    secondary: {
      main: "#5f6368",
    },
    background: {
      default: "#f6f8fc",
      paper: "#ffffff",
    },
    text: {
      primary: "#202124",
      secondary: "#5f6368",
    },
    divider: "#e0e0e0",
    success: { main: "#1e8e3e" },
    warning: { main: "#f9ab00" },
    error: { main: "#d93025" },
  },
  typography: {
    fontFamily: "'Roboto', 'Google Sans', sans-serif",
    h5: {
      fontFamily: "'Google Sans', 'Roboto', sans-serif",
      fontWeight: 500,
    },
    h6: {
      fontFamily: "'Google Sans', 'Roboto', sans-serif",
      fontWeight: 500,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          padding: "8px 24px",
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        },
        elevation1: {
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: "none",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "0 25px 25px 0",
          marginRight: 12,
          "&.Mui-selected": {
            backgroundColor: "#d3e3fd",
            color: "#001d35",
            "&:hover": {
              backgroundColor: "#c2d9fc",
            },
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)",
          borderRadius: 16,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: "#5f6368",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default theme;
