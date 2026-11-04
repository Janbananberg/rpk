// Admin password, checked in the browser. Anyone can read it in the built JavaScript, so it only
// keeps casual visitors out of the admin view — it is not a security boundary. Admin writes are
// meant to be authorized by the backend once there is one.
export const ADMIN_PASSWORD = "plingplong";
