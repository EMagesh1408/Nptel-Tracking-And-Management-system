import React from "react";
import { NPTEL_STATUS_FLOW } from "../data/hierarchy";

const STEP_COLOR = {
  "Not Enrolled": "bg-line text-navy-deep",
  "Enrolled": "bg-brass-light/40 text-brass-dark",
  "Course Completed": "bg-teal-light/30 text-teal",
  "Exam Registered": "bg-brass-light/40 text-brass-dark",
  "Exam Attended": "bg-teal-light/30 text-teal",
  "Qualified": "bg-teal text-white",
};

export default function StatusBadge({ status }) {
  const step = NPTEL_STATUS_FLOW.indexOf(status) + 1;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded ${
        STEP_COLOR[status] || "bg-line text-navy-deep"
      }`}
    >
      <span className="opacity-60">{step}/6</span>
      {status}
    </span>
  );
}
