/**
 * The forced-password-change gate.
 *
 * A user created by HR (a converted volunteer, for instance) gets a temporary password and the server flag
 * `must_change_password`. Until it is cleared, the server answers every authenticated call except `/auth/me`,
 * logout, `POST /auth/change-password` and the page-access manifest with 403 `PASSWORD_CHANGE_REQUIRED`, and the
 * client keeps the user on ONE page. These constants are shared by the router guard, the page and the axios layer.
 */
export const PASSWORD_CHANGE_PATH = '/change-password-required'

/** The `code` of the 403 body the server uses while the flag is set. */
export const PASSWORD_CHANGE_REQUIRED_CODE = 'PASSWORD_CHANGE_REQUIRED'
