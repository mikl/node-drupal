/**
 * Implementation of some of Drupal's database layer in Node.js.
 *
 * Ie. stuff that lives in database.inc in Drupal.
 */
"use strict";

var active_db,
    mysql = require('mysql'),
    pg = require('pg'),
    usePg = false;

/**
 * db_connect() as in Drupal 6.
 *
 * This is much more complex with PDO in Drupal 7, which we won't try to
 * emulate here.
 */
function connect(options, backend) {
  // Custom override. See https://github.com/felixge/node-mysql/issues/82 .
  mysql.Client.prototype.escape = function(val) {
    var object = false;
    if (val === undefined || val === null) {
      return 'NULL';
    }

    switch (typeof val) {
      case 'boolean': return (val) ? 'true' : 'false';
      case 'number': return val+'';
    }


    if (typeof val === 'object') {
      val = val.toString();
      object = true;
    }

    val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
      switch(s) {
        case "\0": return "\\0";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\b": return "\\b";
        case "\t": return "\\t";
        case "\x1a": return "\\Z";
        default: return "\\"+s;
      }
    });

    if (object) {
      return val;
    }

    return "'"+val+"'";
  }

  if (backend === 'pgsql') {
    pg.connect(options, function (client) {
      active_db = client;
      usePg = true;

      active_db.on('error', function (err) {
        console.log(err);
      });
    });
  }
  else {
    active_db = mysql.createClient(options);

    active_db.on('error', function (err) {
      console.log(err);
    });
  }

  return active_db;
}

/**
 * db_query() as in Drupal (though callback-based).
 *
 * This function assumes that db_connect() has done its work, so be sure
 * to call it and wait for its callback first.
 */
function query(queryString, args, callback) {
  if (!active_db) {
    callback('No active database connection for query.');
  }

  active_db.query(queryString, args, callback);
}

module.exports = {
  active_db: active_db,
  connect: connect,
  query: query,
  usePg: function() {return usePg;}
};

