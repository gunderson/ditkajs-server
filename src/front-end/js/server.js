'use strict';
// var _ = require( 'lodash' );
var TASK = require( '../../shared/js/TASK/TASK' );
var log = require( '../../shared/js/TASK/utils/log' );
var bodyParser = require( 'body-parser' );
var express = require( 'express' );
// var favicon = require( 'serve-favicon' );
var logger = require( 'morgan' );
var methodOverride = require( 'method-override' );
var path = require( 'path' );
var chalk = require( 'chalk' );

class Server extends TASK {
	constructor( GLOBALS ) {
		super();
		var app = express();
		app.set( 'env', GLOBALS.ENV.name );

		// ---------------------------------------------------------

		var router = express.Router();
		router.use( logger( 'dev' ) );
		router.use( methodOverride() );
		// parse application/x-www-form-urlencoded
		router.use( bodyParser.urlencoded( {
			extended: false
		} ) );
		// parse application/json
		router.use( bodyParser.json() );
		router.use( express.static( path.resolve( __dirname, '../' ) ) );
		router.use( ( req, res ) => {
			req.method = 'get';
			res.redirect( '/#' + req.originalUrl );
		} );

		// ---------------------------------------------------------

		app.use( '/', router );
		log( chalk.green( 'Front-end server' ), 'starting', __dirname );
		app.listen( GLOBALS.ENV.DOMAINS[ 'front-end' ].port, function() {
			log( chalk.green( 'Front-end server' ), 'listening on port:', chalk.green( `${GLOBALS.ENV.DOMAINS[ 'front-end' ].port}` ) );

		} );
	}
}

module.exports = Server;
