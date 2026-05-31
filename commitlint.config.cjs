/**
 * Conventional Commits config used by both:
 *   - @commitlint/cli (local pre-commit hook, optional — see CONTRIBUTING.md)
 *   - semantic-release in CI to determine the next version
 *
 * Allowed types are kept in sync with the `releaseRules` block in
 * .releaserc.json so a contributor never sees "valid commit but no release".
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "perf",
        "refactor",
        "docs",
        "test",
        "ci",
        "build",
        "chore",
        "deps",
        "revert",
      ],
    ],
    "header-max-length": [2, "always", 100],
    "subject-case": [
      2,
      "never",
      ["start-case", "pascal-case", "upper-case"],
    ],
  },
};
