// The only shape in which a user is ever sent to the browser -- no password, hash or otherwise.
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  fullName: u.fullName || "",
  username: u.username || u.email || "",
  role: u.role,
  school: u.school,
  department: u.department,
  programme: u.programme,
  active: u.active !== false,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

module.exports = { publicUser };
