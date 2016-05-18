var _ = require( 'lodash' );
var $ = require( 'jquery' );
var TASK = require( './TASK' );
var TaskCollection = require( './Collection' );

class Model extends TASK {
	constructor( attributes, options ) {
		super();

		// ---------------------------------------------------
		// Non-attribute Properties

		this._collections = [];

		// ---------------------------------------------------
		// Record Options

		this._options = _.defaults( options, {
			// Whether or not to convert attributes that are collections to a list of model ids rather than saving the complete model
			'toJSONRefs': false,
			// List Attribute names you don't want to save when converting to json
			// useful when you have a property that you want to monitor changes on
			// but that doesn't need to be saved to the server
			'omitAttributes': []
		} );

		// ---------------------------------------------------
		// Record Attributes

		this._attributes = _.defaults( attributes, {
			id: _.uniqueId(),
			url: null
		} );

		// ---------------------------------------------------
		// Bind functions

		TASK.bindFunctions( this, [
			'addToCollection',
			'destroy',
			'fetch',
			'forwardEvent',
			'makeAttribute',
			'removeFromCollection'
		] );


		// ---------------------------------------------------
		// Make Attribute getters & setters

		_.each( this._attributes, this.makeAttribute );

		// ---------------------------------------------------
		// Event Handlers

	}

	[ Symbol.iterator ]() {
		return this._attributes.values();
	}


	// ---------------------------------------------------

	fetch() {
		// load stuff in here
		// resolve the deferred when load is complete

		if ( this.url ) {
			// get the data at the url
			$.get( this.url )
				.then( ( data ) => _.each( data, this.makeAttribute ) );
		} else {
			// we're all set!
			var deferred = $.Deferred();
			deferred.resolve();
			return deferred;
		}

	}

	// ---------------------------------------------------

	save() {

	}

	// ---------------------------------------------------

	toJSON( justId ) {
		if ( justId ) return this._attributes.id;

		return _( this._attributes )
			.omit( this._options.omitAttributes )
			.cloneDeepWith( ( a ) => {
				// pass toJSONRefs to tell collections that may be children of this model whether to
				// save their children as objects or just IDs that can be picked up as references from a master collection when rebuilding
				if ( a.toJSON ) {
					return a.toJSON( this._options.toJSONRefs );
				};
				return a;
			} )
			.value();
	}

	// ---------------------------------------------------

	static deRef( sourceCollection, idList ) {
		return new TaskCollection( sourceCollection.get( idList ) );
	}

	// ---------------------------------------------------

	addToCollection( collection, options ) {
		if ( this._collections.indexOf( collection ) === -1 ) {
			this._collections.push( collection );

			// create listeners on collection for attribute changes
			_.each( this._attributes, ( val, key ) => {
				collection.listenTo( this, `change:${key}`, collection.forwardEvent );
			} );

			// only trigger if model is not already a member
			if ( !options.silent ) {
				this.trigger( 'addToCollection', {
					collection: collection,
					model: this
				} );
			}
		}
		return this;
	}

	// ---------------------------------------------------

	removeFromCollection( collection, options ) {
		if ( this._collections.indexOf( collection ) > -1 ) {
			this._collections.splice( this._collections.indexOf( collection ), 1 );
			// only trigger if model is a member
			if ( !options.silent ) {
				this.trigger( 'removeFromCollection', {
					collection: collection,
					model: this
				} );
			}
		}
		return this;
	}

	// ---------------------------------------------------

	destroy() {
		this.stopListening();
		this._collections = [];
		this._attributes = [];
		this.trigger( 'destroy', this );
		return this;
	}

	// ---------------------------------------------------

	makeAttribute( value, name ) {
		_.each( this._collections, ( c ) => {
			// create forwarder on collection for attribute
			c.listenTo( this, `change:${name}`, c.forwardEvent );
		} );
		Object.defineProperty( this, name, {
			set: ( val ) => {
				this._attributes[ name ] = val;
				var data = {
					model: this,
					name: name,
					value: val,
					type: `change change:${name}`
				};
				this.trigger( data.type, data );

				// if it is an emitter, listen for change events
				if ( _.isFunction( val.trigger ) ) {
					this.listenTo( val, 'change', this.forwardEvent );
				}
			},
			get: () => this._attributes[ name ]
		} );
		this._attributes[ name ] = value;
	}

	// ---------------------------------------------------

	forwardEvent( data ) {
		if ( data.forward === false ) return this;
		data.parents = data.parents || [];
		data.parents.push( this );
		this.trigger( data.type, data );
		return this;
	}

	// ---------------------------------------------------

	get attributes() {
		return this._attributes;
	}
}

module.exports = Model;
