'use strict';
// var _ = require( 'lodash' );
var cp = require( 'child_process' );
var TASK = require( '../../shared/js/TASK/TASK' );
var log = require( '../../shared/js/TASK/utils/log' );
var chalk = require( 'chalk' );
var fs = require( 'fs' );
var https = require( 'https' );
var path = require( 'path' );
var Q = require( 'q' );

class Service extends TASK {
	constructor() {
		super();
		log( chalk.green( 'autoupdate server' ), 'starting', __dirname );

		this.pkg = fs.readFileSync( path.resolve( __dirname, '../../../package.json' ), 'utf-8', ( err ) => {
			if ( err ) {
				// we don't have a local repo
				// make a git repo
				// add the remote origin
				// pull repo
				this.localSha = '';
			}
		} );

		this.pkg = JSON.parse( this.pkg );
		this.pollInterval = null;
		log( chalk.green( 'autoupdate service' ), 'polling every:', chalk.green( `${this.pkg.autoupdate.pollFrequency}ms` ) );
	}

	start() {
		this.pollInterval = setInterval( this.update.bind( this ), this.pkg.autoupdate.pollFrequency );
	}

	stop() {
		clearInterval( this.pollInterval );
	}

	update() {
		this.pollGit()
			.then( this.onReply.bind( this ) );
	}

	pollGit() {
		log( chalk.green( 'autoupdate server' ), 'checking version' );
		var def = Q.defer();
		var options = {
			hostname: this.pkg.autoupdate.remoteHost,
			port: 443,
			path: this.pkg.autoupdate.remotePath,
			method: 'GET',
			headers: {
				'user-agent': 'nodejs autoupdate ping'
			}
		};

		var req = https.request( options, ( res ) => {
			var data = [];
			res.on( 'data', ( chunk ) => data.push( chunk ) );
			res.on( 'end', () => def.resolve( JSON.parse( data.toString() ) ) );
		} );

		req.end();

		req.on( 'error', ( e ) => {
			log( chalk.red( 'autoupdate error:\n' ), e );
		} );
		return def.promise;
	}

	onReply( remotePkg ) {
		if ( this.pkg[ 'build-id' ] !== remotePkg[ 'build-id' ] ) {
			// get the latest
			this.getLatest();
		} else {
			log( chalk.green( 'autoupdate service:' ), 'up-to-date' );
		}
	}

	getLatest() {
		cp.exec( 'git pull --force', ( error, stdout, stderr ) => {
			if ( error ) {
				log( chalk.red( 'autoupdate error:\n' ), error );
			}

			if ( stdout === 'Already up-to-date.\n' ) {
				log( chalk.red( 'autoupdate error:\n' ), stdout );
			}

			this.pullComplete();
		} );
	}

	pullComplete() {
		this.trigger( 'restart-application' );
	}
}

module.exports = Service;
