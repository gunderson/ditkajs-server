'use strict';
var pkg = require( '../../package.json' );

var Server = require( './js/server' );

var argv = require( './cli' );

var GLOBALS = {
	ENV: require( `../shared/js/data/env/${argv.env}` ),
	domains: pkg.domains
};

var apiServer = new Server( GLOBALS );

// tie the interfaces together using events

// TODO: send out a push-notification registration request to Ditka server
