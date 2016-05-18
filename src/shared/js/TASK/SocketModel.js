var _ = require( 'lodash' );
// var $ = require( 'jquery' );
var TaskModel = require( './Model' );
var io = require( 'socket-io/client' );

class SocketModel extends TaskModel {
	constructor( attributes, options ) {
		super( _.defaults( attributes, {
			// default attributes
		} ), _.defaults( options, {
			// default options
		} ) );

		// ---------------------------------------------------
		// Local Properties

		this.socket = io.socket();

		// ---------------------------------------------------
		// Bind Functions

		TaskModel.bindFunctions( this, [
			'onConnect'
		] );

		// ---------------------------------------------------
		// Event Handlers

		io.on( 'connect', this.onConnect );
	}

	onConnect() {
		// do something
	}
}

module.exports = SocketModel;
