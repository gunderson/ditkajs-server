var _ = require( 'lodash' );
var chalk = require( "chalk" );

function log() {
	var ts = '[' + chalk.gray( getTimestamp() ) + ']';
	var args = Array.prototype.slice.apply( arguments );
	args.unshift( ts );
	return console.log.apply( console, args );
}

function getTimestamp() {
	var date = new Date();
	var tz = date.toLocaleTimeString( 'en-us', {
			timeZoneName: 'short'
		} )
		.split( ' ' )[ 2 ];
	var h = date.getHours();
	var i = date.getMinutes();
	var s = date.getSeconds();
	var ml = _.padStart( date.getMilliseconds(), 4, '0' );

	return `${tz} ${h}:${i}:${s}.${ml}`;
}

module.exports = log;
