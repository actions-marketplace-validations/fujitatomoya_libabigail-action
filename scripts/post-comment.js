// Sticky PR comment + label management for libabigail-action.
// Invoked from action.yml via actions/github-script. Inputs come through env.

module.exports = async ({ github, context, core }) => {
  const verdict       = process.env.VERDICT       || 'error';
  const summary       = process.env.SUMMARY       || '';
  const report        = process.env.REPORT        || '';
  const baseLib       = process.env.BASE_LIB      || '';
  const headLib       = process.env.HEAD_LIB      || '';
  const suppressions  = process.env.SUPPRESSIONS  || '';
  const markerSuffix  = process.env.MARKER_SUFFIX || 'abi-check';
  const labelCompat   = process.env.LABEL_COMPAT  || '';
  const labelBreak    = process.env.LABEL_BREAK   || '';
  const commentPr     = (process.env.COMMENT_PR || 'true').toLowerCase() === 'true';

  const pr = context.payload.pull_request;
  if (!pr) {
    core.info('Not a pull_request event; skipping PR comment and labels.');
    return;
  }
  const prNumber = pr.number;
  const sha = (pr.head && pr.head.sha) ? pr.head.sha.substring(0, 7) : '';
  const { owner, repo } = context.repo;

  const marker = `<!-- libabigail-action-marker:${markerSuffix} -->`;

  let icon = 'ℹ️';
  let title = `Verdict: ${verdict}`;
  switch (verdict) {
    case 'compatible':
      icon = '✅';
      title = 'Verdict: compatible';
      break;
    case 'additions-only':
      icon = '✅';
      title = 'Verdict: compatible (additions only)';
      break;
    case 'incompatible':
      icon = '❌';
      title = 'Verdict: incompatible';
      break;
    case 'error':
      icon = '⚠️';
      title = 'Verdict: error';
      break;
  }

  // GitHub comment hard limit is 65536 chars; leave headroom for the wrapper.
  const MAX_REPORT_CHARS = 55000;
  let reportBody = report.length === 0
    ? '(empty report — no differences printed by abidiff)'
    : report;
  let truncationNote = '';
  if (reportBody.length > MAX_REPORT_CHARS) {
    reportBody = reportBody.slice(0, MAX_REPORT_CHARS);
    truncationNote = '\n... (report truncated; see the full report in the workflow run artifacts)';
  }

  const lines = [
    '## ABI Compliance Check',
    '',
    `${icon} **${title}**`,
    '',
    summary,
    '',
    'Compared:',
    `- Base: \`${baseLib}\``,
    `- Head: \`${headLib}\`${sha ? ` @ ${sha}` : ''}`,
    '',
    '<details><summary>Full abidiff report</summary>',
    '',
    '```',
    reportBody + truncationNote,
    '```',
    '',
    '</details>',
    '',
    `<sub>Updated for commit ${sha || '(unknown)'}` +
      (suppressions ? ` · suppressions: \`${suppressions}\`` : '') +
      `</sub>`,
    marker,
  ];
  const body = lines.join('\n');

  if (commentPr) {
    try {
      const existing = await github.paginate(github.rest.issues.listComments, {
        owner, repo, issue_number: prNumber, per_page: 100,
      });
      const found = existing.find((c) => c.body && c.body.includes(marker));
      if (found) {
        await github.rest.issues.updateComment({
          owner, repo, comment_id: found.id, body,
        });
        core.info(`Updated existing ABI check comment id=${found.id}.`);
      } else {
        const created = await github.rest.issues.createComment({
          owner, repo, issue_number: prNumber, body,
        });
        core.info(`Created ABI check comment id=${created.data.id}.`);
      }
    } catch (e) {
      core.warning(`Failed to post / update PR comment: ${e.message}`);
    }
  } else {
    core.info('comment-pr=false; skipping sticky comment.');
  }

  // Label reconciliation.
  const isCompatible = (verdict === 'compatible' || verdict === 'additions-only');
  const isBreak      = (verdict === 'incompatible');
  const toAdd = [];
  const toRemove = [];

  if (labelCompat) {
    if (isCompatible) toAdd.push(labelCompat);
    else toRemove.push(labelCompat);
  }
  if (labelBreak) {
    if (isBreak) toAdd.push(labelBreak);
    else toRemove.push(labelBreak);
  }

  if (toAdd.length) {
    try {
      await github.rest.issues.addLabels({
        owner, repo, issue_number: prNumber, labels: toAdd,
      });
      core.info(`Added labels: ${toAdd.join(', ')}`);
    } catch (e) {
      core.warning(`addLabels failed: ${e.message}`);
    }
  }
  for (const name of toRemove) {
    try {
      await github.rest.issues.removeLabel({
        owner, repo, issue_number: prNumber, name,
      });
      core.info(`Removed label: ${name}`);
    } catch (e) {
      // 404 = label was not on the PR; safe to ignore.
      if (e.status !== 404) {
        core.warning(`removeLabel(${name}) failed: ${e.message}`);
      }
    }
  }
};
