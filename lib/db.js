/**
 * Implementation of some of Drupal's database layer in Node.js.
 *
 * Ie. stuff that lives in database.inc in Drupal.
 */

var active_db,
    mysql = require('mysql');

/**
 * db_connect() as in Drupal 6.
 *
 * This is much more complex with PDO in Drupal 7, which we won't try to
 * emulate here.
 */
function connect(options, callback) {
  // A shortcut. Currently we only support one active db.
  if (active_db) {
    if (callback) {
      callback(active_db);
    }

    return active_db;
  }

  var client = new mysql.Client(options);

  client.connect(function () {
    active_db = client;

    if (callback) {
      callback(active_db);
    }
  });
  
}


/**
 * db_query() as in Drupal (though callback-based).
 *
 * This function assumes that db_connect() has done its work, so be sure
 * to call it and wait for its callback first.
 */
function query(queryString, args, callback) {
  active_db.query(queryString, args, callback);
}

module.exports = {
  active_db: active_db,
  connect: connect,
  query: query
};

