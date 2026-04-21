# Changelog updater

Update (or create) `CHANGELOG.md` in the project root to reflect the work done in the current session.

## Steps

1. **Read the current branch name** with `git branch --show-current`.

2. **Check whether `CHANGELOG.md` exists.**
   - If it does not exist: run `git log --pretty=format:"%ad | %s" --date=short` to get the full commit history, then build the file from scratch (see Format section below).
   - If it exists: read its current contents so you can append without duplicating entries.

3. **Collect commits not yet recorded.** Run:
   ```
   git log --pretty=format:"%ad | %H | %s" --date=short
   ```
   Compare the hashes against what is already in `CHANGELOG.md`. Only process commits whose hash is not already present.

4. **Group new commits by date** (YYYY-MM-DD). Within each date group, write one bullet per commit using the subject line. Omit merge commits (subjects starting with "Merge ").

5. **Write the updated file.** Insert new date sections at the top (most-recent-first). Preserve all existing content below. Each date section looks like:

   ```markdown
   ## YYYY-MM-DD

   - <commit subject>
   - <commit subject>
   ```

6. **Report** to the user: how many new entries were added, which dates were touched, and whether the file was created or updated.

## Format rules

- Top of file: `# Changelog` heading (only on creation).
- Date headings: `## YYYY-MM-DD`, descending order.
- Bullets: start with `- `, use the commit subject verbatim, no period appended.
- Do **not** include commit hashes in the rendered bullets (they are only used internally to detect duplicates).
- Do **not** add any explanatory prose between sections.
