require( 'babelify' );
var gulp = require( 'gulp' ),
	gutil = require( 'gulp-util' ),
	sass = require( 'gulp-sass' ),
	csso = require( 'gulp-csso' ),
	browserify = require( 'browserify' ),
	pug = require( 'gulp-pug' ),
	tap = require( 'gulp-tap' ),
	rm = require( 'gulp-rm' ),
	domain = require( 'domain' ),
	uglify = require( 'gulp-uglify' ),
	jstConcat = require( 'gulp-jst-concat' ),
	plumber = require( 'gulp-plumber' ),
	_ = require( 'lodash' ),
	livereload = require( 'gulp-livereload' ), // Livereload plugin needed: https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei
	path = require( 'path' ),
	fs = require( 'fs' ),
	// cp = require( 'child_process' ),
	source = require( 'vinyl-source-stream' ),
	buffer = require( 'vinyl-buffer' ),
	rename = require( 'gulp-rename' ),
	pkg = require( './package.json' );

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
	.usage( 'Usage: $0 -env [options]' )
	.showHelpOnFail( false, 'Specify --help for available options' )
	// environment
	.option( 'env', {
		alias: 'environment',
		describe: 'define the deployment target [dev|stage|prod]',
		type: 'string',
		nargs: 1,
		default: 'dev'
	} )
	.argv;

var env = argv.env;
gutil.log( 'Using environment', gutil.colors.green( env ) );

// --------------------------------------------------
// Environment vars

var GLOBALS = {
	ENV: require( `./src/shared/js/data/env/${env}` )
};
var META = require( './src/shared/js/data/meta.json' );

// --------------------------------------------------
// Setup domain tasks

_.each( pkg.domains, setupDomainTasks );

function setupDomainTasks( domainSettings, domainName ) {

	// --------------------------------------------------

	gulp.task( `css:${domainName}`, function() {
		return gulp
			.src( `./src/${domainName}/sass/**/*.sass` )
			.pipe( plumber( onError ) )
			.pipe( sass( {
				includePaths: [ `./src/${domainName}/sass/` ],
				errLogToConsole: true
			} ) )
			.pipe( csso() )
			.pipe( gulp.dest( `./dist/${domainName}/` ) )
			.pipe( livereload() )
			.on( 'error', gutil.log );
	} );

	// --------------------------------------------------

	gulp.task( `copy-js-src:${domainName}`, function() {
		return gulp.src( `./src/${domainName}/js/**/*` )
			.pipe( plumber( onError ) )
			.pipe( gulp.dest( `./dist/${domainName}/js/` ) )
			.pipe( livereload() )
			.on( 'error', gutil.log );
	} );

	// --------------------------------------------------

	gulp.task( `copy-start:${domainName}`, function() {
		return gulp.src( `./src/${domainName}/start.js` )
			.pipe( plumber( onError ) )
			.pipe( gulp.dest( `./dist/${domainName}/` ) )
			.pipe( livereload() )
			.on( 'error', gutil.log );
	} );

	// --------------------------------------------------

	// TODO: process assets
	gulp.task( `copy-assets:${domainName}`, [ `copy-js-src:${domainName}`, `copy-start:${domainName}` ], function() {
		return gulp
			.src( `./src/${domainName}/assets/**/*` )
			.pipe( plumber( onError ) )
			.pipe( gulp.dest( `./dist/${domainName}/assets/` ) )
			.pipe( livereload() )
			.on( 'error', gutil.log );
	} );

	// --------------------------------------------------

	gulp.task( `compile-js:${domainName}`, [
		`copy-js-src:${domainName}`
	], function() {
		return gulp
			.src( `./src/${domainName}/js/index.js`, {
				read: false
			} )
			.pipe( tap( function( file ) {
				var d = domain.create();

				d.on( 'error', function( err ) {
					gutil.beep();
					gutil.log(
						gutil.colors.red( 'Browserify compile error:' ),
						err.message,
						'\n\t',
						gutil.colors.cyan( 'in file' ),
						file.path
					);
				} );

				// these line breaks are weird becasue the linter and auto-saver can't decide how many tabs to indent
				// for some reason these line breaks fix the problem
				d
					.run( function() {
						file
							.contents = browserify( {
								entries: [ file.path ],
								debug: env === 'dev',
								paths: [ `./src/${domainName}/js/`, './node_modules', './src/shared/js/' ]
							} )
							.bundle()
							.pipe( plumber( onError ) )
							.pipe( source( `${domainName}/index.js` ) )
							.pipe( buffer() )
							.pipe( env !== 'dev' ? uglify() : buffer() )
							.pipe( gulp.dest( './dist/' ) )
							.pipe( livereload() )
							.on( 'error', gutil.log );
					} );
			} ) );
	} );

	function listFolders( dir ) {
		return fs
			.readdirSync( dir )
			.filter( function( file ) {
				return fs
					.statSync( path.join( dir, file ) )
					.isDirectory();
			} );
	}

	function listFiles( dir ) {
		return fs
			.readdirSync( dir )
			.filter( function( file ) {
				return !fs
					.statSync( path.join( dir, file ) )
					.isDirectory();
			} );
	}

	// --------------------------------------------------

	gulp.task( `static-templates:${domainName}`, function() {
		var copyPath = './src/shared/js/data/copy/';
		var langs = listFolders( copyPath );
		var langData = {};
		if ( !langs.length ) {
			throw new Error( 'No language folders in ./src/shared/js/data/copy/' );
		}
		var files = listFiles( path.join( copyPath, langs[ 0 ] ) );
		if ( !files.length ) {
			throw new Error( 'No data files in ./src/shared/js/data/copy/' + langs[ 0 ] );
		}
		return langs.map( ( lang ) => {
			langData[ lang ] = {};
			_.each( files, ( filename ) => {
				langData[ lang ][ path.basename( filename, '.json' ) ] = require( path.resolve( copyPath, lang, filename ) );
			} );
			GLOBALS.COPY = langData[ lang ];
			return gulp
				.src( [ `./src/${domainName}/pug/static/**/*.pug`, `!./src/${domainName}/pug/static/**/_*.pug` ] )
				.pipe( plumber( onError ) )
				.pipe( rename( function( path ) {
					path.basename += `.${lang}`;
					path.extname = '.html';
				} ) )
				.pipe( pug( {
					pretty: true,
					locals: {
						GLOBALS: GLOBALS,
						lang: lang,
						META: META
					}
				} ) )
				.pipe( gulp.dest( `./dist/${domainName}` ) )
				.pipe( livereload() )
				.on( 'error', gutil.log )
				.on( 'end', () => {
					if ( lang === 'en' ) {
						gulp
							.src( `./dist/${domainName}/index.en.html` )
							.pipe( plumber( onError ) )
							.pipe( rename( function( path ) {
								path.basename = 'index';
								path.extname = '.html';
							} ) )
							.pipe( gulp.dest( `./dist/${domainName}` ) );
					}
				} );
		} );
	} );

	// --------------------------------------------------

	gulp.task( `dynamic-templates:${domainName}`, function() {
		var stream = gulp
			.src( [ `./src/${domainName}/pug/dynamic/**/*.pug`, `!./src/${domainName}/pug/dynamic/**/_*.pug` ] )
			.pipe( plumber( onError ) )
			.pipe( pug( {
				pretty: true
			} ) )
			.pipe( rename( function( path ) {
				path.dirname = 'home';
				path.extname = '';
				path.relative = true;
			} ) )
			.pipe( jstConcat( 'templates.js', {
				exportString: 'module.exports'
			} ) )
			.pipe( gulp.dest( `./src/${domainName}/js/lib/` ) )
			.pipe( livereload() )
			.on( 'error', gutil.log );
		return stream;
	} );

	// --------------------------------------------------

	gulp.task( `watch:${domainName}`,
		function() {
			livereload.listen( domainSettings.lrPort );
			gulp.watch( [ `./src/${domainName}/js/**/*.js` ], [ `compile-js:${domainName}` ] );
			gulp.watch( [ `./src/${domainName}/pug/dynamic/**/*.pug` ], [ `dynamic-templates:${domainName}` ] );
			gulp.watch( [ `./src/${domainName}/pug/static/**/*.pug` ], [ `static-templates:${domainName}` ] );
			gulp.watch( [ `./src/${domainName}/sass/**/*.sass` ], [ `css:${domainName}` ] );
		} );

	// --------------------------------------------------

	gulp.task( domainName, [
		`dynamic-templates:${domainName}`,
		`compile-js:${domainName}`,
		`static-templates:${domainName}`,
		`copy-assets:${domainName}`,
		`css:${domainName}`
	] );

	// --------------------------------------------------

}

// --------------------------------------------------
// General project tasks

gulp.task( 'clean', function() {
	return gulp
		.src( [ './dist/', './dist/**/*', './dist/**/.*' ], {
			read: false
		} )
		.pipe( plumber( onError ) )
		.pipe( rm() )
		.on( 'error', gutil.log );
} );

// --------------------------------------------------

gulp.task( 'copy-start', function() {
	return gulp
		.src( './src/start.js' )
		.pipe( plumber( onError ) )
		.pipe( gulp.dest( './dist/' ) )
		.on( 'error', gutil.log );
} );

// --------------------------------------------------

gulp.task( 'copy-shared', function() {
	return gulp.src( './src/shared/**/*' )
		.pipe( plumber( onError ) )
		.pipe( gulp.dest( './dist/shared/' ) )
		.on( 'error', gutil.log );
} );

// --------------------------------------------------

gulp.task( 'watch', _.map( pkg.domains, ( d, domainName ) => `watch:${domainName}` ), function() {
	return gulp.watch( [ './src/shared/js/**/*' ], _.map( pkg.domains, ( d, domainName ) => `compile-js:${domainName}` ) );
} );

// --------------------------------------------------

gulp.task( 'run-all', [ 'copy-start', 'copy-shared' ].concat( _.map( pkg.domains, ( d, domainName ) => `${domainName}` ) ) );

gulp.task( 'default', [ 'clean' ], function() {
	return gulp.run( 'run-all' );
} );

// --------------------------------------------------

function onError( err ) {
	gutil.beep();
	gutil.log( err );
	this.emit( 'end' );
};
