/**
 * Node.js Password Manager (aka NPM !== npm)
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.2
 * @license MIT
 **/

/** 3rd Party tools **/
var debug   = require('debug')('cli'),
    prompt  = require('prompt'),
    fs      = require('fs'),
    program = require('commander');

/** Internal **/
var npm = require('./lib/npm.js');

npm.ee.on('init', function() {
  program.version(require('./package.json').version);

  program
    .command('init')
    .description('Init the NPM database')
    .action(function() {
      // this technically does nothing.
    });

  program
    .command('destroy')
    .description('Destroy the NPM database. IRREVERSABLE!')
    .action(function() {
      npm.db.close(function() {
        fs.unlink('./npm.db', function(err) {
          if(err) {
            console.log('Failed to destroy the database.');
          } else {
            console.log('He\'s dead, Jim.');
          }
        });
      });
    });

  program
    .command('new <service> <username>')
    .description('Create a new password for service+username')
    .action(function(cmd, options){
      var service  = cmd,
          username = options;

      debug('add', service, username);
      npm.addAccount(service, username, function(err, res) {
        if(err) {
          debug('error occurred');
          console.log(err);
        } else if(res === false) {
          debug('already exists');
          console.log('Did you mean to `regen '+service, username+'`? That service+user already exists.');
        } else {
          debug('succedded');
          console.log('Success! Now try `get '+service, username+'`');
        }
      });
    });

  program
    .command('get <service> <username>')
    .description('Get a service+usernames\' password')
    .action(function(cmd, options){
      var service  = cmd,
          username = options;

      debug('get', service, username);
      npm.getAccount(service, username, function(err, res) {
        if(err) {
          debug('error occurred');
          console.log(err);
        } else if(res === false) {
          debug('service+user doesn\'t work.');
          console.log('There\'s either, a service without that user, or a user without that service!');
        } else {
          console.log(res.service+'\+'+res.username, '=', res.password);
        }
      });
    });

  program.parse(process.argv);
})
