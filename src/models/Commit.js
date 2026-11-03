'use strict';

const { Schema, model } = require('mongoose');

const commitSchema = new Schema(
  {
    deliveryId: { type: String, index: true },

    repository: {
      id: { type: Number },
      name: { type: String },
      fullName: { type: String },
      url: { type: String },
    },

    branch: { type: String },

    // The commit SHA
    commitId: { type: String },

    message: { type: String },
    url: { type: String },
    timestamp: { type: Date },

    author: {
      name: { type: String },
      email: { type: String },
      username: { type: String },
    },

    committer: {
      name: { type: String },
      email: { type: String },
      username: { type: String },
    },

    added: [{ type: String }],
    removed: [{ type: String }],
    modified: [{ type: String }],

    pusher: {
      name: { type: String },
      email: { type: String },
    },

    compareUrl: { type: String },
  },
  { timestamps: true }
);

// Ensure a commit SHA is stored only once per repository.
commitSchema.index({ 'repository.fullName': 1, commitId: 1 }, { unique: true });

module.exports = model('Commit', commitSchema);
