'use strict';
var pkg = require( '../../package.json' );
var Server = require( './js/server' );
var Dispatcher = require( './js/dispatcher' );
var cli = require( './cli' );

var GLOBALS = {
	ENV: require( `../shared/js/data/env/${cli.env}` ),
	domains: pkg.domains
};

var apiServer = new Server( GLOBALS );
var dispatcher = new Dispatcher( GLOBALS );

// tie the interfaces together using events

apiServer.on( 'register', dispatcher.register );
apiServer.on( 'broadcast', dispatcher.broadcast );

// TODO: send out a push-notification registration request to Ditka server
