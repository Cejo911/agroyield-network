/**
 * Commitlint configuration — AgroYield Network.
 *
 * Enforces the Conventional Commits format the team settled on during the
 * Unicorn Sprint commit-hygiene pass (H1.5):
 *
 *     <type>(<scope>): <sentence>
 *
 * Scopes are free-form (we use the affected surface, e.g. `sms`, `prices`,
 * `admin`, `api`, `db`, `ci`, `deps`) rather than a fixed enum — forcing a
 * canonical list tends to produce bad-faith scope picks when the author is
 * in a rush. Types are the standard Conventional Commits set inherited from
 * @commitlint/config-conventional.
 *
 * Hard rules beyond the base config:
 *   • Subject must be a full sentence (min 10 chars) — "fix bug" is useless
 *     when you're debugging at 2am three months from now.
 *   • Subject must not end with a period.
 *   • Header capped at 100 chars (GitHub truncates otherwise).
 *   • Body lines capped at 120 chars — but only warn, not error, because
 *     pasted stack traces happen.
 *
 * Lives at the repo root so husky's commit-msg hook can find it by default.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-min-length': [2, 'always', 10],
    'subject-full-stop':  [2, 'never', '.'],
    'header-max-length':  [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
  },
}
