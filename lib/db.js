/**
 * Implementation of some of Drupal's database layer in Node.js.
 *
 * Ie. stuff that lives in database.inc in Drupal.
 */
"use strict";

var activeDb,
    mysql = require('mysql'),
    pg = require('pg'),
    activeBackend,
    connectionOptions;

/**
 * Initialize and setup the connection to Drupal for futher
 */
function init(options, backend) {
  activeBackend = backend;
  connectionOptions = options;
  connect(connectionOptions);
}

function getClient(callback) {
  if (activeBackend === 'mysql') {
    if (activeDb) {
      callback(null, activeDb);
    }
    else {
      connect(connectionOptions);
      callback(null, activeDb);
    }
  }
  if (activeBackend === 'pgsql') {
    connect(connectionOptions, callback);
  }
}

/**
 * db_connect() as in Drupal 6.
 *
 * This is much more complex with PDO in Drupal 7, which we won't try to
 * emulate here.
 */
function connect(options, callback) {
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
  };

  if (activeBackend === 'pgsql' && callback) {
    pg.connect(options, callback);
  }
  else if (activeBackend === 'mysql') {
    activeDb = mysql.createClient(options);

    if (activeDb !== null) {
      activeDb.on('error', function (err) {
        console.log(err);
      });
    }
  }

  return activeDb;
}

/**
 * db_query() as in Drupal (though callback-based).
 */
function query(queryString, args, callback) {
  getClient(function (err, client) {
    if (err) {throw err;}
    if (!client) {
      callback('Could not connect to the database', null);
    }
    else {
      runQuery(client, queryString, args, callback);
    }
  });
}

/**
 * Do the actual work of running the query.
 */
function runQuery(client, queryString, args, callback) {
  if (activeBackend === 'mysql') {
    queryString = queryString.replace(/\$\d+/, '?');
  }

  client.query(queryString, args, function (err, result) {
    if (err) {
      callback(err, null);
      return;
    }
    if (activeBackend === 'mysql') {
      callback(err, result);
    }
    else if (activeBackend === 'pgsql') {
      var rows = [];
      if (result.rows) {
        rows = result.rows;
      }
      callback(err, rows);
    }
  });
}

module.exports = {
  connect: connect,
  getClient: getClient,
  init: init,
  query: query,
  runQuery: runQuery
};

