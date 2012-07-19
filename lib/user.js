/**
 * Implementation of some of Drupal's user system in Node.js.
 */
"use strict";

var db = require('./db'),
    DRUPAL_ANONYMOUS_RID = 1,
    DRUPAL_AUTHENTICATED_RID = 2;

/**
 * Fetch a user object.
 *
 * Like user_load() in Drupal core.
 *
 * Currently, we only support loading by numeric user ids.
 */
function load(user_info, callback) {
  var query = "SELECT * FROM users WHERE uid = ?;";
  if (db.usePg() === true) {
    query = "SELECT * FROM users WHERE uid = $1;";
  }
  db.query(query, [user_info], function (err, results) {
    if (err) {
      callback(err, null);
      return;
    }

    // When the user is loaded, get its roles.
    if ((db.usePg() !== true && results) || (db.usePg() === true && results.rows.length > 0)) {
      var user = {},
          rows = results;
      if (db.usePg() === true) {
        rows = results.rows;
      }
      user = rows[0];

      user.roles = [];

      // Default roles.
      if (user.uid) {
        user.roles[DRUPAL_AUTHENTICATED_RID] = 'authenticated user';
      }
      else {
        user.roles[DRUPAL_ANONYMOUS_RID] = 'anonymous user';
      }

      // Load assigned roles from the database.
      var query = "SELECT r.rid, r.name FROM role AS r INNER JOIN users_roles AS ur ON ur.rid = r.rid WHERE ur.uid = ?;";
      if (db.usePg() === true) {
        query = "SELECT r.rid, r.name FROM role AS r INNER JOIN users_roles AS ur ON ur.rid = r.rid WHERE ur.uid = $1;";
      }
      db.query(query, [user.uid], function (err, results) {
        if (err) {
          callback(err, null);
        }

        if ((db.usePg() !== true && results) || (db.usePg() === true && results.rows.length > 0)) {
          var rows = result;
          if (db.usePg() === true) {
            rows = results.rows;
          }

          rows.forEach(function (row) {
            user.roles[row.rid] = row.name;
          });
        }

        // Now we're done loading the user, call the callback.
        if (callback) {
          callback(null, user);
        }
      });
    }
    else {
      callback('User not found');
    }
  });
}

/**
 * Get all permissions granted to a set of roles.
 *
 * Like user_role_permissions() in Drupal core.
 */
function role_permissions(roles, callback) {
  var permissions = [],
      fetch = [];

  if (roles) {
    // TODO: Here we could do with some caching like Drupal does.
    roles.forEach(function (name, rid) {
      fetch.push(rid);
    });

    // Get permissions for the rids.
    if (fetch) {
      var query = "SELECT rid, permission FROM role_permission WHERE rid IN (?);";
      if (db.usePg()) {
        query = "SELECT rid, permission FROM role_permission WHERE rid IN ($1);";
      }
      db.query(query, [fetch], function (err, results) {
        if (err) {
          callback(err, null);
        }

        if ((db.usePg() !== true && results) || (db.usePg() === true && results.rows.length > 0)) {
          var rows = result;
          if (db.usePg() === true) {
            rows = results.rows;
          }

          rows.forEach(function (row) {
            permissions.push(row.permission);
          });
        }

        callback(null, permissions);
      });
    }
  }
}

/**
 * Check if user has a specific permission.
 *
 * Like user_access() in Drupal core.
 *
 * Unlike in Drupal, we do not have a global user object, so this
 * implementation always require the account parameter to be set.
 */
function access(permission, account, callback) {
  // User #1 has all privileges:
  if (account.uid === 1) {
    callback(null, true);
    return;
  }

  // If permissions is already loaded, use them.
  if (account.permissions) {
    callback(null, account.permissions.indexOf(permission) > -1);
    return;
  }

  role_permissions(account.roles, function (err, permissions) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, permissions.indexOf(permission) > -1);
  });
}

/**
 * Load a user session.
 *
 * This function does not exist in Drupal core, as it uses PHPs rather
 * complex session system we do not attempt to reconstruct here.
 *
 * This only works when Drupal uses the (default) database session
 * backend. Memcache and other session backends not supported.
 */
function session_load(sid, callback) {
  var rows = [],
     query = "SELECT * FROM sessions WHERE sid = ?;";
  if (db.usePg() === true) {
    query = "SELECT * FROM sessions WHERE sid = $1;";
  }
  db.query(query, [sid], function (err, results) {
    if (err) {
      callback(err, null);
      return;
    }

    if ((db.usePg() !== true && results) || (db.usePg() === true && results.rows.length > 0)) {
      rows = results;
      if (db.usePg() === true) {
        rows = results.rows;
      }
    }

    if (rows.length > 0) {
      callback(null, rows[0]);
    }
    else {
      callback('Session not found', null);
    }
  });
}

module.exports = {
  access: access,
  load: load,
  role_permissions: role_permissions,
  session_load: session_load
};

