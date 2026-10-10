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

// Sick leave documents (link-only attachments, each with a "sent to fiduciaire" flag)
const sickDocUrl = (e) => `/leave/sick_leave/${e.name}/${e.year}/${e.month}`;
export const selectSickLeaveAttachments = (e) => api.post(`${sickDocUrl(e)}/attachment/select`).then((r) => r.data);
export const openSickLeaveAttachment = (e, path) => api.post(`${sickDocUrl(e)}/attachment/open`, { path }).then((r) => r.data);
export const removeSickLeaveAttachment = (e, path) =>
  api.delete(`${sickDocUrl(e)}/attachment`, { data: { path } }).then((r) => r.data);
export const setSickLeaveSent = (e, path, sent) => api.put(`${sickDocUrl(e)}/fiduciaire`, { path, sent }).then((r) => r.data);

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

// App users (audit trail)
export const getAppUsers = () => api.get("/config/users").then((r) => r.data);
export const setCurrentUser = (name) => api.put("/config/users/current", { name }).then((r) => r.data);
export const addAppUser = (name) => api.post("/config/users", { name }).then((r) => r.data);

// Recap email (Italian per-member summary, templates in app_settings.json)
export const getRecap = (params) => api.get("/recap", { params }).then((r) => r.data);
export const getRecapSettings = () => api.get("/recap/settings").then((r) => r.data);
export const updateRecapSettings = (data) => api.put("/recap/settings", data).then((r) => r.data);

export default api;
