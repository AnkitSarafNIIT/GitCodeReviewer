'use strict';

const Commit = require('../models/Commit');

/**
 * Upserts a single commit document.
 * The unique index on (repository.fullName, commitId) ensures idempotency:
 * retried deliveries will update the existing record rather than duplicate it.
 *
 * @param {object} commitData - Shaped commit data ready for the schema
 * @returns {Promise<object>} - The upserted document
 */
async function upsertCommit(commitData) {
  return Commit.findOneAndUpdate(
    {
      'repository.fullName': commitData.repository.fullName,
      commitId: commitData.commitId,
    },
    { $set: commitData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * Finds all commits for a given repository, sorted newest first.
 *
 * @param {string} repoFullName - e.g. "owner/repo"
 * @returns {Promise<object[]>}
 */
async function findByRepository(repoFullName) {
  return Commit.find({ 'repository.fullName': repoFullName }).sort({ timestamp: -1 });
}

module.exports = { upsertCommit, findByRepository };
