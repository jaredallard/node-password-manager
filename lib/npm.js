/**
 * NPM Library
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

var sqlite  = require('sqlite3'),
    request = require('request'), // this is for possible online service later.
    fs      = require('fs'),
    crypto  = require('crypto'),
    debug   = require('debug')('NPM'),
    events  = require('events'),
    prompt  = require('prompt');

/**
 * Initial Construct
 *
 * @todo implement other storage methods, i.e plaintext? (not likely), arangodb, mongodb, etc.
 * @constructor
 **/
var npm = function() {
  var that = this;
  this.db.create(function() {
    that.db.load();

    that.db.debug('create:next', 'emit init');
    setTimeout(function() {
      that.ee.emit('init'); // fix async issues
    }, 200);

    debug('constructed');
  });
};

npm.prototype.ee = new events.EventEmitter();

/**
 * DB access class, for transparency.
 *
 * @extends npm
 **/
npm.prototype.db = {
  /**
   * Debug class
   **/
  debug: require('debug')('db'),
  loaded: 0,

  /**
   * Create a new database
   *
   * @note This is called on initial construct of the NPM object *everytime*.
   **/
  create: function(next) {
    var that = this;
    if(!fs.existsSync('./npm.db')) {
      this.open();
      this.debug('need to initialize sqlite db')
      try {
        this.db.run("CREATE TABLE `accounts` ( \
          id MEDIUMINT AUTO_INCREMENT, \
          service VARCHAR(64), \
          username VARCHAR(64), \
          password VARCHAR(64), \
          PRIMARY KEY(id) \
        )", [], function() {
          that.debug('create:db:next', 'exec next')
          next();
        });
      } catch(err) {
        this.debug('failed to execute initial MySQL statement')
        this.debug(err);
        process.exit();
      }
    } else {
      next();
      this.open();
    }

    return true;
  },

  /**
   * Load data, or anything else that may need to be done after DB create.
   **/
  load: function() {
    // we don't do anything here.
  },

  /**
   * Close the database
   **/
  close: function(next) {
    this.db.close(next);

    return true;
  },

  /**
   * Open the database
   **/
  open: function() {
    try {
      this.db = new sqlite.Database('./npm.db');
    } catch(err) {
      return false;
    }

    return true;
  },

  /**
   * Add data to the database
   **/
  add: function(service, username, password, next) {
    var that = this;
    this.check(service, username, function(err, exists) {
      if(err) {
        next(err);
        return;
      }

      if(exists) {
        next(null, false);
        return;
      }

      that.debug('add', service, username, password);
      that.db.run('INSERT INTO `accounts` VALUES (null, $service, $username, $password)', {
        $service: service,
        $username: username,
        $password: password
      });

      next(null, true);
    });
  },

  /**
   * Check if it already exists
   *
   * @callback next
   **/
  check: function(service, username, next) {
    var that = this;

    this.debug('check', service, username);
    that.db.get('SELECT username, password FROM `accounts` WHERE username=$username AND service=$service', {
      $service: service,
      $username: username
    }, function(err, res) {
      if(err) {
        next(err);
      } else {
        if(res) {
          that.debug('check', 'it exists');
          next(null, true);
        } else {
          that.debug('check', 'doesn\'t exist');
          next(null, false);
        }
      }
    });

  },

  /**
   * Get data from database
   *
   * @callback next
   **/
  get: function(service, username, next) {
    var that = this;
    this.check(service, username, function(err, exists) {
      if(err) {
        next(err);
        return;
      }

      if(!exists) {
        next(null, false);
        return;
      }

      that.debug('get', service, username);
      that.db.get('SELECT service, username, password FROM `accounts` WHERE username=$username AND service=$service', {
        $service: service,
        $username: username
      }, function(err, res) {
        if(err) {
          next(err);
        } else {
          if(res) {
            next(null, res);
          } else {
            next(null, false);
          }
        }
      });
    });
  },

  /**
   * Remove data from the database
   **/
  remove: function(service, username) {
    this.db.run('DELETE FROM `accounts` WHERE username=$username AND service=$service', {
      $service: service,
      $username: username
    });

    return true;
  }
};

/**
 * Add an account to be managed by NPM
 *
 * @callback next
 **/
npm.prototype.addAccount = function(service, username, next) {
  debug('addAccount', 'new account');

  var password = this.generatePassword();
  this.db.add(service, username, password, next);
}

/**
 * Get an accounts credentials
 *
 * @callback next
 **/
npm.prototype.getAccount = function(service, username, next) {
  debug('getAccount', 'retrieve account info');

  this.db.get(service, username, next);
}

/**
 * Generate a password
 *
 * @return {string} password
 **/
npm.prototype.generatePassword = function() {
  var buf = crypto.randomBytes(32);
  return buf.toString('base64');
}

// export a new npm instance
module.exports = new npm();
