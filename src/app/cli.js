var pkg = require( '../../package.json' );


// ----------------------------------------------------------------
// CLI

var argv = require( 'yargs' )
	.epilog( 'copyright 2015' )
	// version
	.alias( 'v', 'version' )
	.version( function() {
		return pkg.version;
	} )
	.describe( 'v', 'show version information' )
	// help text
	.alias( 'h', 'help' )
	.help( 'help' )
	.usage( 'Usage: $0 [options]' )
	.showHelpOnFail( false, 'Specify --help for available options' )
	// environment
	.option( 'env', {
		alias: 'environment',
		describe: 'define the deployment target [ dev | stage | prod ]',
		type: 'string',
		nargs: 1,
		default: 'dev'
	} )
	// domains to start
	.option( 'd', {
		alias: 'domain',
		describe: 'limit startup to certain domains',
		type: 'array',
		nargs: 1,
		default: [ 'device', 'front-end', 'webhooks', 'autoupdate' ]
	} )
	.argv;

module.exports = argv;
