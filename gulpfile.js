require( 'babelify' );

var _ = require( 'lodash' );
var browserify = require( 'browserify' );
var buffer = require( 'vinyl-buffer' );
var cli = require( './gulp/cli' );
var csso = require( 'gulp-csso' );
var docco = require( 'gulp=docco' );
var domain = require( 'domain' );
var fs = require( 'fs' );
var gulp = require( 'gulp' );
var gutil = require( 'gulp-util' );
var jstConcat = require( 'gulp-jst-concat' );
var livereload = require( 'gulp-livereload' ); // Livereload plugin needed: https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdle;
var path = require( 'path' );
var pkg = require( './package.json' );
var plumber = require( 'gulp-plumber' );
var pug = require( 'gulp-pug' );
var rename = require( 'gulp-rename' );
var rm = require( 'gulp-rm' );
var sass = require( 'gulp-sass' );
var source = require( 'vinyl-source-stream' );
var tap = require( 'gulp-tap' );
var uglify = require( 'gulp-uglify' );

var env = cli.env;
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

	gulp.task( `${domainName}:css`, function() {
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

	gulp.task( `${domainName}:copy-js-src`, function() {
		return gulp.src( `./src/${domainName}/js/**/*` )
			.pipe( plumber( onError ) )
			.pipe( gulp.dest( `./dist/${domainName}/js/` ) )
			.pipe( livereload() )
			.on( 'error', gutil.log );
	} );

	// --------------------------------------------------

	gulp.task( `${domainName}:copy-start`, function() {
		return gulp.src( [ `./src/${domainName}/*.js` ] )
			.pipe( plumber( onError ) )
			.pipe( gulp.dest( `./dist/${domainName}/` ) )
			.pipe( livereload() )
			.on( 'error', gutil.log );
	} );

	// --------------------------------------------------

	// TODO: process assets
	gulp.task( `${domainName}:copy-assets`, [ `${domainName}:copy-js-src`, `${domainName}:copy-start` ], function() {
		return gulp
			.src( `./src/${domainName}/assets/**/*` )
			.pipe( plumber( onError ) )
			.pipe( gulp.dest( `./dist/${domainName}/assets/` ) )
			.pipe( livereload() )
			.on( 'error', gutil.log );
	} );

	// --------------------------------------------------

	gulp.task( `${domainName}:compile-js`, [
		`${domainName}:copy-js-src`
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

	gulp.task( `${domainName}:static-templates`, function() {
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

	gulp.task( `${domainName}:dynamic-templates`, function() {
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

	gulp.task( `${domainName}:watch`,
		function() {
			livereload.listen( domainSettings.lrPort );
			gulp.watch( [ `./src/${domainName}/js/**/*.js` ], [ `${domainName}:compile-js` ] );
			gulp.watch( [ `./src/${domainName}/pug/dynamic/**/*.pug` ], [ `${domainName}:dynamic-templates` ] );
			gulp.watch( [ `./src/${domainName}/pug/static/**/*.pug` ], [ `${domainName}:static-templates` ] );
			gulp.watch( [ `./src/${domainName}/sass/**/*.sass` ], [ `${domainName}:css` ] );
		} );

	// --------------------------------------------------

	gulp.task( domainName, [
		`${domainName}:dynamic-templates`,
		`${domainName}:compile-js`,
		`${domainName}:static-templates`,
		`${domainName}:copy-assets`,
		`${domainName}:css`
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

gulp.task( 'copy-app', function() {
	return gulp
		.src( './src/app/**/*' )
		.pipe( plumber( onError ) )
		.pipe( gulp.dest( './dist/app/' ) )
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

gulp.task( 'docs', function() {
	return gulp.src( './src/**/*.js' )
		.pipe( plumber( onError ) )
		.pipe( docco() )
		.pipe( gulp.dest( './dist/front-end/docs/' ) )
		.on( 'error', gutil.log );
} );

// --------------------------------------------------

gulp.task( 'watch', _.map( pkg.domains, ( d, domainName ) => `${domainName}:watch` ), function() {
	return gulp.watch( [ './src/shared/js/**/*' ], _.map( pkg.domains, ( d, domainName ) => `${domainName}:compile-js` ) );
} );

// --------------------------------------------------

gulp.task( 'run-all', [ 'copy-app', 'copy-shared' ].concat( _.map( pkg.domains, ( d, domainName ) => `${domainName}` ) ) );

gulp.task( 'default', [ 'clean' ], function() {
	return gulp.run( 'run-all' );
} );

// --------------------------------------------------

function onError( err ) {
	gutil.beep();
	gutil.log( err );
	this.emit( 'end' );
};
