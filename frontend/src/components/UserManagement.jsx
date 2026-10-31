import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";
import { useToast } from "../context/ToastContext";
import { SCHOOLS, getDepartments, programmeLabel } from "../data/hierarchy";
import { PlusIcon, SearchIcon, ResetIcon, EditIcon, TrashIcon, CopyIcon, PowerIcon, UsersIcon, AlertIcon } from "./Icons";
import UserFormModal from "./UserFormModal";
import ConfirmDialog from "./ConfirmDialog";
import Modal from "./Modal";
import Fab from "./Fab";
import { Bar } from "./Skeleton";
import { personName, initialsOf } from "../utils/person";

const PAGE_SIZE = 15;
const EMPTY_FILTERS = { search: "", role: "", school: "", department: "" };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function RoleBadge({ role }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${role === "hod" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
      {role === "hod" ? "HOD" : "Staff"}
    </span>
  );
}

function StatusDot({ active }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? "text-emerald-700" : "text-slate-500"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />{active ? "Active" : "Disabled"}
    </span>
  );
}

// Shown once, right after an account is created or its password is reset. Passwords are stored
// only as one-way hashes, so this is the one and only moment the password can be read.
function CredentialsDialog({ creds, onClose }) {
  const { showToast } = useToast();
  const copy = async (text, what) => {
    const ok = await copyText(text);
    showToast(ok ? `${what} copied` : "Could not copy — select and copy manually", ok ? "success" : "error");
  };
  const all = `Username: ${creds.username}\nPassword: ${creds.password}`;

  return (
    <Modal
      size="md"
      z="z-[65]"
      title={creds.title}
      subtitle={`Share these login details with ${creds.name}.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary inline-flex items-center justify-center gap-1.5" onClick={() => copy(all, "Login details")}><CopyIcon /> Copy both</button>
          <button type="button" className="btn-primary" onClick={onClose}>Done</button>
        </>
      }
    >
      <div className="space-y-2.5">
        {[["Username", creds.username], ["Password", creds.password]].map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
              <div className="font-mono text-sm text-slate-900 break-all">{value}</div>
            </div>
            <button type="button" className="btn-secondary !px-3 text-xs inline-flex items-center gap-1.5" onClick={() => copy(value, label)}><CopyIcon /> Copy</button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
        <span className="mt-px shrink-0"><AlertIcon /></span>
        For security the password is stored scrambled and can never be shown again. Copy it now. If it is lost, open the account and set a new one.
      </div>
    </Modal>
  );
}

function IconBtn({ label, onClick, children, tone = "" }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      className={`w-10 h-10 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 active:bg-blue-100 transition ${tone}`}>
      {children}
    </button>
  );
}

export default function UserManagement() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false); // phones: collapsed by default

  const [formTarget, setFormTarget] = useState(null); // null | "new" | user
  const [creds, setCreds] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load accounts");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters]);

  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return users.filter((u) =>
      (!filters.role || u.role === filters.role) &&
      (!filters.school || u.school === filters.school) &&
      (!filters.department || u.department === filters.department) &&
      (!q || [u.fullName, u.name, u.username, u.department].some((v) => (v || "").toLowerCase().includes(q)))
    );
  }, [users, filters]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = users.filter((u) => u.active).length;
  const hasFilters = Object.values(filters).some(Boolean);
  const dropdownCount = [filters.role, filters.school, filters.department].filter(Boolean).length;

  const saveForm = async (payload, plainPassword) => {
    const isNew = formTarget === "new";
    const { data } = isNew ? await api.post("/users", payload) : await api.put(`/users/${formTarget.id}`, payload);
    const renamed = !isNew && data.username !== formTarget.username;
    setFormTarget(null);
    await load();
    if (plainPassword) {
      setCreds({ title: isNew ? "Account created" : "Password updated", name: personName(data), username: data.username, password: plainPassword });
    } else {
      showToast(isNew ? "Account created" : renamed ? `Username changed to "${data.username}"` : "Account updated", "success");
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { active: !u.active });
      showToast(u.active ? `${personName(u)} can no longer sign in` : `${personName(u)} can sign in again`, "success");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update the account", "error");
    }
  };

  const confirmDelete = async () => {
    const u = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/users/${u.id}`);
      showToast(`${personName(u)} deleted`, "success");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete the account", "error");
    }
  };

  const actions = (u) => (
    <>
      <IconBtn label="Edit, rename or reset password" onClick={() => setFormTarget(u)}><EditIcon /></IconBtn>
      <IconBtn label={u.active ? "Disable account" : "Enable account"} onClick={() => toggleActive(u)} tone={u.active ? "" : "text-emerald-600"}><PowerIcon /></IconBtn>
      <IconBtn label="Delete account" onClick={() => setDeleteTarget(u)} tone="hover:!text-rose-600 hover:!bg-rose-50"><TrashIcon /></IconBtn>
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold">Staff &amp; HOD accounts</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${users.length} account${users.length !== 1 ? "s" : ""} · ${activeCount} active${users.length - activeCount ? ` · ${users.length - activeCount} disabled` : ""}`}
          </p>
        </div>
        <button className="btn-primary hidden sm:inline-flex items-center gap-2" onClick={() => setFormTarget("new")}><PlusIcon /> Create account</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none"><SearchIcon /></span>
            <input className="field search-input w-full" placeholder="Search name, username or programme" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} aria-label="Search accounts" />
          </div>
          <button type="button" className="sm:hidden btn-secondary relative !px-3.5" aria-expanded={showFilters} aria-label="Show filters" onClick={() => setShowFilters((v) => !v)}>
            Filters{dropdownCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-700 text-white text-[11px]">{dropdownCount}</span>}
          </button>
        </div>
        <div className={`${showFilters ? "grid" : "hidden"} sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3`}>
          <select className="field" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} aria-label="Filter by type">
            <option value="">All types</option><option value="staff">Staff</option><option value="hod">HOD</option>
          </select>
          <select className="field" value={filters.school} onChange={(e) => setFilters({ ...filters, school: e.target.value, department: "" })} aria-label="Filter by school">
            <option value="">All schools</option>
            {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="field sm:col-span-2" value={filters.department} disabled={!filters.school} onChange={(e) => setFilters({ ...filters, department: e.target.value })} aria-label="Filter by programme">
            <option value="">{filters.school ? "All programmes" : "Pick a school first"}</option>
            {getDepartments(filters.school).map((d) => <option key={d} value={d}>{programmeLabel(d)}</option>)}
          </select>
          <button type="button" className="btn-secondary inline-flex items-center justify-center gap-2 sm:col-span-2 md:col-span-4 md:justify-self-start" disabled={!hasFilters} onClick={() => setFilters(EMPTY_FILTERS)}><ResetIcon /> Clear filters</button>
        </div>
      </div>

      {loadError && <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">{loadError}</div>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4 flex items-center gap-3"><Bar className="w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><Bar className="h-4 w-1/2" /><Bar className="h-3 w-1/3" /></div></div>
            ))}
          </div>
        ) : !visible.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3"><UsersIcon size={22} /></div>
            <p className="font-medium text-slate-700">{users.length ? "No accounts match these filters" : "No Staff or HOD accounts yet"}</p>
            <p className="text-sm text-slate-500 mt-1">{users.length ? "Try clearing a filter." : "Create the first login for a programme."}</p>
            {!users.length && <button className="btn-primary mt-4 inline-flex items-center gap-2" onClick={() => setFormTarget("new")}><PlusIcon /> Create account</button>}
          </div>
        ) : (
          <>
            {/* Phones: one card per account */}
            <ul className="md:hidden divide-y divide-slate-100">
              {pageRows.map((u) => (
                <li key={u.id} className={`p-4 ${u.active ? "" : "bg-slate-50/70"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-10 h-10 rounded-full text-sm font-semibold flex items-center justify-center shrink-0 ${u.active ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>{initialsOf(u)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm break-words ${u.active ? "" : "text-slate-500"}`}>{personName(u)}</span>
                        <RoleBadge role={u.role} />
                      </div>
                      {u.fullName && u.name !== u.fullName && <div className="text-xs text-slate-500 mt-0.5">{u.name}</div>}
                      <button type="button" className="mt-0.5 font-mono text-[13px] text-slate-600 inline-flex items-center gap-1.5 break-all text-left active:text-blue-700" onClick={async () => showToast((await copyText(u.username)) ? "Username copied" : "Could not copy", "success")}>
                        {u.username} <CopyIcon />
                      </button>
                      <div className="text-xs text-slate-500 mt-1">{programmeLabel(u.department)} · {u.school}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <StatusDot active={u.active} />
                    <span className="inline-flex items-center gap-1">{actions(u)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablets and up: full table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    {["Person", "Username", "Type", "Programme", "Status", "Updated", "Actions"].map((h) => <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((u) => (
                    <tr key={u.id} className={`border-b border-slate-100 last:border-b-0 ${u.active ? "" : "bg-slate-50/70"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <span className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${u.active ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>{initialsOf(u)}</span>
                          <span className="min-w-0">
                            <span className={`block font-medium ${u.active ? "" : "text-slate-500"}`}>{personName(u)}</span>
                            {u.fullName && u.name !== u.fullName && <span className="block text-xs text-slate-500">{u.name}</span>}
                            {!u.fullName && <span className="block text-xs text-amber-600">Add the person's name</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-[13px]">{u.username}</span>
                          <button type="button" className="text-slate-400 hover:text-blue-700" title="Copy username" aria-label={`Copy username ${u.username}`} onClick={async () => showToast((await copyText(u.username)) ? "Username copied" : "Could not copy", "success")}><CopyIcon /></button>
                        </span>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <div>{programmeLabel(u.department)}</div>
                        <div className="text-xs text-slate-500">{u.school}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusDot active={u.active} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{fmtDate(u.updatedAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1">{actions(u)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && visible.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visible.length)} of {visible.length}</span>
            <span className="inline-flex gap-2">
              <button className="btn-secondary !py-1.5" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn-secondary !py-1.5" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button>
            </span>
          </div>
        )}
      </div>

      <Fab raised label="Account" icon={<PlusIcon />} onClick={() => setFormTarget("new")} />

      {formTarget && <UserFormModal user={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} onSave={saveForm} />}
      {creds && <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this account?"
          message={`${personName(deleteTarget)} (${deleteTarget.username}) will no longer be able to sign in. Student records they entered are kept. To only block sign-in for now, disable the account instead.`}
          confirmLabel="Delete account"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
