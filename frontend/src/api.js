import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nptel_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const hadSession = !!localStorage.getItem("nptel_token");
      localStorage.removeItem("nptel_token");
      localStorage.removeItem("nptel_user");
      if (window.location.pathname !== "/login") {
        // Leave a short note for the login page: why the person was signed out.
        const msg = err.response?.data?.message || "";
        const friendly = /disabled|password was changed/i.test(msg) ? msg : "Your session has expired. Please sign in again.";
        if (hadSession) sessionStorage.setItem("nptel_flash", friendly);
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// Certificates are private: the server only releases a file to a signed-in person who is allowed to
// see that student. So the browser fetches it WITH the login token and opens the result, instead of
// following a public link.
//   view     -> opens the file in a new tab
//   download -> saves it with its original name
export async function openCertificate(studentId, record, { download = false } = {}) {
  // Open the tab straight away (inside the tap) so phone browsers don't block it as a pop-up.
  const tab = download ? null : window.open("", "_blank");
  try {
    const { data } = await api.get(`/students/${studentId}/records/${record._id}/certificate`, {
      params: download ? { download: 1 } : undefined,
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    if (download) {
      const a = document.createElement("a");
      a.href = url;
      a.download = record.certificateFileName || "certificate";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else if (tab) {
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } else {
      window.location.href = url; // pop-ups blocked: open in this tab instead
    }
  } catch (err) {
    tab?.close();
    // Error replies arrive as a blob here; read the server's message out of it.
    let message = "Could not open the certificate";
    try {
      if (err.response?.data instanceof Blob) message = JSON.parse(await err.response.data.text()).message || message;
    } catch { /* keep the default message */ }
    throw new Error(message);
  }
}

export default api;
