/**
 * Implementation of some of Drupal's user system in Node.js.
 */

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
  db.query("SELECT * FROM users WHERE uid = ?", [user_info], function (err, results) {
    if (err) {
      throw err;
    }

    // When the user is loaded, get its roles.
    if (results) {
      var user = results[0];

      user.roles = [];

      // Default roles.
      if (user.uid) {
        user.roles[DRUPAL_AUTHENTICATED_RID] = 'authenticated user';
      }
      else {
        user.roles[DRUPAL_ANONYMOUS_RID] = 'anonymous user';
      }

      // Load assigned roles from the database.
      db.query("SELECT r.rid, r.name FROM role AS r INNER JOIN users_roles AS ur ON ur.rid = r.rid WHERE ur.uid = ?", [user.uid], function (err, results) {
        if (err) {
          throw err;
        }

        if (results) {
          results.forEach(function (row) {
            user.roles[row.rid] = row.name;
          });
        }

        // Now we're done loading the user, call the callback.
        if (callback) {
          callback(user);
        }
      });
    }
  });
}

module.exports = {
  load: load
};


