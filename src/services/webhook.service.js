'use strict';

const env = require('../config/env');
const commitService = require('./commit.service');
const WebhookDelivery = require('../models/WebhookDelivery');

/**
 * Extracts the branch name from a GitHub ref string.
 * e.g. "refs/heads/main" -> "main"
 *
 * @param {string} ref
 * @returns {string}
 */
function parseBranch(ref) {
  return ref.replace(/^refs\/heads\//, '');
}

/**
 * Returns true if the branch should be processed according to REVIEW_BRANCHES.
 * When the filter set is empty, every branch is accepted.
 *
 * @param {string} branch
 * @returns {boolean}
 */
function isBranchAllowed(branch) {
  if (env.reviewBranches.size === 0) return true;
  return env.reviewBranches.has(branch);
}

/**
 * Records a delivery attempt in WebhookDelivery so we can detect duplicates.
 *
 * @param {string} deliveryId
 * @param {string} event
 * @param {string} repositoryFullName
 * @param {'processed'|'ignored'} status
 */
async function recordDelivery(deliveryId, event, repositoryFullName, status) {
  await WebhookDelivery.create({ deliveryId, event, repositoryFullName, status });
}

/**
 * Checks whether a delivery has already been processed.
 *
 * @param {string} deliveryId
 * @returns {Promise<boolean>}
 */
async function isDeliveryDuplicate(deliveryId) {
  const existing = await WebhookDelivery.findOne({ deliveryId });
  return existing !== null;
}

/**
 * Main orchestrator for a push event.
 *
 * Applies branch filtering, maps the payload commits to the Commit schema,
 * upserts each one, and records the delivery.
 *
 * @param {string} deliveryId
 * @param {object} payload     - Parsed GitHub push event body
 * @returns {Promise<{commitsSaved: number, branch: string}>}
 */
async function processPushEvent(deliveryId, payload) {
  const branch = parseBranch(payload.ref);
  const repoFullName = payload.repository.full_name;

  if (!isBranchAllowed(branch)) {
    await recordDelivery(deliveryId, 'push', repoFullName, 'ignored');
    return { commitsSaved: 0, branch, ignored: true, reason: 'branch not in REVIEW_BRANCHES' };
  }

  const repoInfo = {
    id: payload.repository.id,
    name: payload.repository.name,
    fullName: payload.repository.full_name,
    url: payload.repository.html_url,
  };

  const pusher = {
    name: payload.pusher?.name || '',
    email: payload.pusher?.email || '',
  };

  const compareUrl = payload.compare || '';

  const commits = payload.commits || [];
  let savedCount = 0;

  for (const c of commits) {
    const commitData = {
      deliveryId,
      repository: repoInfo,
      branch,
      commitId: c.id,
      message: c.message,
      url: c.url,
      timestamp: new Date(c.timestamp),
      author: {
        name: c.author?.name || '',
        email: c.author?.email || '',
        username: c.author?.username || '',
      },
      committer: {
        name: c.committer?.name || '',
        email: c.committer?.email || '',
        username: c.committer?.username || '',
      },
      added: c.added || [],
      removed: c.removed || [],
      modified: c.modified || [],
      pusher,
      compareUrl,
    };

    await commitService.upsertCommit(commitData);
    savedCount++;
  }

  await recordDelivery(deliveryId, 'push', repoFullName, 'processed');

  return { commitsSaved: savedCount, branch };
}

module.exports = { processPushEvent, isDeliveryDuplicate };
