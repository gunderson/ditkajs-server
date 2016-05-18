/* eslint indent:0 no-unused-vars:0*/
var _ = require( 'lodash' );
var Autoupdate = require( './js/autoupdate' );
var chalk = require( 'chalk' );
var cli = require( './cli' );
var cp = require( 'child_process' );
var fs = require( 'fs' );
var log = require( '../shared/js/TASK/utils/log' );
var path = require( 'path' );
var pkg = require( '../../package.json' );

log( chalk.green( '----' ), 'STARTING APPLICATION', chalk.green( '----' ) );
log( chalk.green( 'Starting domains:' ), runDomains );
log( chalk.green( 'Using environment:' ), cli.d );

// ------------------------------------------------------
// Start Application Services

var autoupdate = new Autoupdate();

if ( cli.env === 'prod' ) {
	autoupdate.start();
	autoupdate.on( 'restart-application', restartApplication );
}

// ------------------------------------------------------
// start domains

var startedDomainsProcesses = _( pkg.domains )
	.pick( cli.d )
	.map( ( domain, domainName ) => {
		var processPath = path.resolve( __dirname, '..', domainName );
		var process = cp.fork( path.resolve( processPath, 'start' ), [ '--env', cli.env ], {
				cwd: processPath
			} )
			.on( 'message', ( message ) => {
				log( chalk.yellow( domainName ), message );

				switch ( message ) {
					case 'autoupdate':
						autoupdate.update();
						break;
					case 'restart':
						restartApplication();
						break;
				}
			} );

		process.domainName = domainName;

		return process;
	} )
	.value();

// ------------------------------------------------------
// Application Directives

function restartApplication() {
	log( chalk.red( '----' ), 'KILLING APPLICATION', chalk.red( '----' ) );

	_.each( startedDomainsProcesses, ( process ) => {
		log( chalk.red( 'Killing domain:' ), process.domainName );
		process.kill();
	} );

	log( chalk.yellow( '----' ), 'RESTARTING APPLICATION', chalk.yellow( '----' ) );
	var child = cp.spawn( 'npm', [ 'start' ], {
		detached: true,
		stdio: 'ignore'
	} );

	child.unref();
	child = null;
	process.exit();
}
