import React from "react";
import Modal from "./Modal";

// Confirmation before any destructive action. On phones it rises as a bottom sheet with the
// main button on top, within thumb reach.
export default function ConfirmDialog({ title = "Are you sure?", message, confirmLabel = "Confirm", danger = true, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      size="sm"
      z="z-[70]"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className={danger ? "px-4 py-2.5 text-sm font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.97] min-h-[44px] sm:min-h-0" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
