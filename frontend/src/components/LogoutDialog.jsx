import React from "react";
import Modal from "./Modal";
import { LogoutIcon, PowerIcon } from "./Icons";

import { ROLE_LABEL, personName, initialsOf } from "../utils/person";
import { programmeLabel } from "../data/hierarchy";

// "Ready to leave?" -- the same sheet on every dashboard.
// Phones: slides up from the bottom, "Log out" on top and "Stay signed in" below it (thumb friendly).
// Tablets and desktops: a small centred dialog. The icon is a door with an arrow that nudges outwards.
export default function LogoutDialog({ user, onConfirm, onCancel }) {
  return (
    <Modal
      headless
      size="sm"
      z="z-[70]"
      title="Log out"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} autoFocus>Stay signed in</button>
          <button
            type="button"
            onClick={onConfirm}
            className="lo-confirm group inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[46px] sm:min-h-0 rounded-xl text-white text-sm font-semibold transition hover:brightness-110 active:scale-[0.97]"
          >
            <span className="transition-transform duration-300 group-hover:translate-x-0.5"><PowerIcon size={17} /></span> Log out
          </button>
        </>
      }
    >
      <div className="text-center pt-1 pb-1 sm:pt-2">
        <div className="lo-orb mx-auto w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center">
          <span className="logout-door"><LogoutIcon size={32} /></span>
        </div>
        <h3 className="mt-6 text-xl font-semibold tracking-tight">Ready to leave?</h3>
        <p className="mt-1.5 mx-auto max-w-xs text-sm text-slate-500 leading-relaxed">Your work is saved. You will need your username and password to sign back in.</p>

        {user && (
          <div className="mt-5 mx-auto max-w-xs flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-left">
            <span className="who-avatar w-11 h-11 shrink-0 rounded-2xl text-sm font-bold flex items-center justify-center" aria-hidden="true">{initialsOf(user)}</span>
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold text-slate-800 truncate">{personName(user)}</div>
              <div className="mt-0.5 text-xs text-slate-500 truncate">{ROLE_LABEL[user.role] || user.role}{user.department ? ` · ${programmeLabel(user.department)}` : ""}</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
