import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Team
export const getTeam = () => api.get("/team").then((r) => r.data);
export const addTeamMember = (data) => api.post("/team", data).then((r) => r.data);
export const updateTeamMember = (name, data) => api.put(`/team/${name}`, data).then((r) => r.data);
export const deleteTeamMember = (name) => api.delete(`/team/${name}`);

// Leave
export const getLeave = (type, params) => api.get(`/leave/${type}`, { params }).then((r) => r.data);
export const addLeave = (type, data) => api.post(`/leave/${type}`, data).then((r) => r.data);
export const updateLeave = (type, name, year, month, data) =>
  api.put(`/leave/${type}/${name}/${year}/${month}`, data).then((r) => r.data);
export const deleteLeave = (type, name, year, month) =>
  api.delete(`/leave/${type}/${name}/${year}/${month}`);

// Holidays
export const getHolidays = (params) => api.get("/holidays", { params }).then((r) => r.data);
export const addHolidayEntry = (data) => api.post("/holidays", data).then((r) => r.data);
export const updateHolidayEntry = (date, year, data) =>
  api.put(`/holidays/${date}/${year}`, data).then((r) => r.data);
export const deleteHolidayEntry = (date, year) => api.delete(`/holidays/${date}/${year}`);

// Balances
export const getBalances = (params) => api.get("/balances", { params }).then((r) => r.data);
export const computeBalances = (params) => api.get("/balances/compute", { params }).then((r) => r.data);
export const setBalance = (data) => api.post("/balances", data).then((r) => r.data);

// Config
export const getConfig = () => api.get("/config").then((r) => r.data);
export const updateConfig = (data) => api.put("/config", data).then((r) => r.data);

// Data file
export const getDataFile = () => api.get("/config/file").then((r) => r.data);
export const setDataFile = (path) => api.put("/config/file", { path }).then((r) => r.data);
export const browseFiles = (path) => api.get("/config/browse", { params: { path } }).then((r) => r.data);

export default api;
