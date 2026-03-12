'use strict';

const createMeetingsRouter = require('./meetings');
const createMeetingModesRouter = require('./meeting-modes');
const createDocumentsRouter = require('./documents');
const createWikisRouter = require('./wikis');
const createTasksRouter = require('./tasks');
const createGovernanceRouter = require('./governance');
const createKnowledgeRouter = require('./knowledge');

/**
 * Assemble and mount all route modules onto the Express app.
 * @param {import('express').Application} app
 * @param {object} deps - { models, redis, helpers, io }
 */
function setupRoutes(app, deps) {
  app.use('/', createMeetingsRouter(deps));
  app.use('/', createMeetingModesRouter(deps));
  app.use('/', createDocumentsRouter(deps));
  app.use('/', createWikisRouter(deps));
  app.use('/', createTasksRouter(deps));
  app.use('/', createGovernanceRouter(deps));
  app.use('/', createKnowledgeRouter(deps));
}

module.exports = setupRoutes;
