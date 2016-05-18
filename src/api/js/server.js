'use strict';
var TASK = require( '../../shared/js/TASK/TASK' );
var log = require( '../../shared/js/TASK/utils/log' );
// var _ = require( 'lodash' );
var express = require( 'express' );
var HeaderUtils = require( './utils/HeaderUtils' );
var logger = require( 'morgan' );
var chalk = require( 'chalk' );

class Server extends TASK {
	constructor( GLOBALS ) {
		super();
		var app = express();

		var router = express.Router();
		router.use( logger( 'dev' ) );

		router.route( '/' )
			.get( ( req, res, next ) => {
				HeaderUtils.addJSONHeader( res );
				HeaderUtils.addCORSHeader( res );
				res.send( {
					status: 'ok'
				} );
				next();
			} );

		router.route( '/whoami' )
			.get( ( req, res, next ) => {
				HeaderUtils.addJSONHeader( res );
				HeaderUtils.addCORSHeader( res );

				var data = {
					action: 'register',
					groupid: req.params.group,
					deviceid: req.params.id,
					address: req.address,
					services: req.services
				};

				res.send( data );
			} );

		router.route( '/register/:groupid/:deviceid' )
			.post( ( req, res, next ) => {
				HeaderUtils.addJSONHeader( res );
				HeaderUtils.addCORSHeader( res );

				var data = {
					action: 'register',
					groupid: req.params.group,
					deviceid: req.params.id,
					address: req.address,
					services: req.services
				};

				res.send( data );
				this.trigger( 'register', req.params );
			} );

		router.route( '/broadcast/:groupid' )
			.post( ( req, res, next ) => {
				HeaderUtils.addJSONHeader( res );
				HeaderUtils.addCORSHeader( res );

				var data = {
					action: 'broadcast',
					groupid: req.params.groupid,
					message: req.params.message
				};

				res.send( data );
				this.trigger( 'broadcast', data );
			} );

		app.use( '/', router );
		log( chalk.green( 'Device server:' ), 'Starting', __dirname );
		app.listen( GLOBALS.ENV.DOMAINS.device.port, function() {
			log( chalk.green( 'Device server' ), 'listening on port:', chalk.green( `${GLOBALS.ENV.DOMAINS.device.port}` ) );
		} );
	}
}

module.exports = Server;
