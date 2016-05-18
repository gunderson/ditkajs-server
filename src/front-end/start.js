'use strict';
var pkg = require( '../../package.json' );

var Server = require( './js/server' );

var cli = require( 'cli' );

var GLOBALS = {
	ENV: require( `../shared/js/data/env/${cli.env}` )
};

var frontEndServer = new Server( GLOBALS ); // eslint-disable-line no-unused-vars
