// Complete School -> Department -> Programme hierarchy, exactly as defined
// in the NPTEL Tracking & Management System project document.
// (Mirrors frontend/src/data/hierarchy.js -- keep both in sync if you edit the hierarchy.)

const HIERARCHY = [
  {
    school: "School of Languages",
    departments: [{ department: "Department of Languages", programmes: ["Language Programmes"] }],
  },
  {
    school: "School of Sciences",
    departments: [
      { department: "Department of Mathematics", programmes: ["B.Sc. Mathematics", "M.Sc. Mathematics"] },
      { department: "Department of Physics", programmes: ["B.Sc. Physics"] },
      { department: "Department of Chemistry", programmes: ["B.Sc. Chemistry", "M.Sc. Chemistry"] },
      {
        department: "Department of Plant Biology & Plant Biotechnology",
        programmes: ["B.Sc. Plant Biology and Plant Biotechnology"],
      },
      {
        department: "Department of Zoology",
        programmes: ["B.Sc. Advanced Zoology and Biotechnology", "M.Sc. Zoology"],
      },
      { department: "Department of Biotechnology", programmes: ["B.Sc. Biotechnology"] },
    ],
  },
  {
    school: "School of Humanities",
    departments: [
      { department: "Department of Economics", programmes: ["B.A. Economics", "M.A. Economics"] },
      {
        department: "Department of Defence & Strategic Studies",
        programmes: ["B.A. Defence & Strategic Studies", "M.A. Defence and Strategic Studies"],
      },
      { department: "Department of Sociology", programmes: ["B.A. Sociology"] },
      { department: "Department of Political Science", programmes: ["B.A. Political Science"] },
      { department: "Department of Social Work", programmes: ["MSW – Master of Social Work"] },
    ],
  },
  {
    school: "School of Commerce",
    departments: [
      { department: "Department of Commerce", programmes: ["B.Com. General", "M.Com. General"] },
      { department: "Department of Corporate Secretaryship", programmes: ["B.Com. Corporate Secretaryship"] },
      { department: "Department of Accounting & Finance", programmes: ["B.Com. Accounting & Finance"] },
      { department: "Department of Commerce / Honours", programmes: ["B.Com. Honours"] },
      { department: "Department of Professional Accounting", programmes: ["B.Com. Professional Accounting"] },
      { department: "Department of Commerce – Computer Applications", programmes: ["B.Com. Computer Application"] },
      {
        department: "Department of Information System Management",
        programmes: ["B.Com. Information System Management"],
      },
    ],
  },
  {
    school: "School of Management",
    departments: [
      {
        department: "Department of Business Administration",
        programmes: ["B.B.A. – Bachelor of Business Administration", "MBA – Master of Business Administration"],
      },
      { department: "Department of Retail Management", programmes: ["B.B.A. Retail Management"] },
      { department: "Department of Bank Management", programmes: ["B.Com. Bank Management"] },
      { department: "Department of Marketing Management", programmes: ["B.Com. Marketing Management"] },
    ],
  },
  {
    school: "School of Information Technology",
    departments: [
      { department: "Department of Computer Applications", programmes: ["BCA", "MCA"] },
      { department: "Department of Computer Science", programmes: ["B.Sc. Computer Science"] },
      { department: "Department of Information Technology", programmes: ["B.Sc. Information Technology"] },
      { department: "Department of Data Analytics", programmes: ["B.Sc. Data Analytics"] },
      { department: "Department of Visual Communication", programmes: ["B.Sc. Visual Communication"] },
      {
        department: "Department of Computer Science with AI",
        programmes: ["B.Sc. Computer Science with AI", "M.Sc. Computer Science with AI"],
      },
    ],
  },
];

module.exports = { HIERARCHY };
