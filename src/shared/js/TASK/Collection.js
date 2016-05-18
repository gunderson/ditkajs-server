var _ = require( 'lodash' );
var TASK = require( './TASK' );
var TaskModel = require( './Model' );

class Collection extends TASK {

	constructor( models, options ) {
		super();
		this._options = _.extend( {
			Model: TaskModel,
			url: null
		}, options );

		this._models = [];
		this.reset( models );
	}

	// ---------------------------------------------------

	[ Symbol.iterator ]() {
		return this._models.values();
	}

	// ---------------------------------------------------

	reset( models, options ) {
		options = options || {};
		// kill existing models
		this.empty();
		// create new models
		_.each( models, ( m ) => this.add( m, options ) );
		if ( !options.silent ) {
			this.trigger( 'reset', this );
		}
		return this;
	}

	// ---------------------------------------------------

	set( models, options ) {
		options = options || {};
		models = _.isArray( models ) ? models : [ models ];
		_.each( models, ( attributes ) => {
			var model = this.get( attributes.id );
			if ( model ) {
				// if the model exists, update it's attributes
				model.set( attributes );
			} else {
				// otherwise, add it
				this.add( attributes );
			}

		} );
		return this;
	}

	// ---------------------------------------------------

	add( models, options ) {
		options = options || {};
		// if models isn't an array, make it one
		models = _.isArray( models ) ? models : [ models ];
		var updated = _.map( models, ( attributes ) => {
			// create new models
			if ( attributes.id ) {
				var existingModel = this.get( attributes.id );
				if ( existingModel ) {
					if ( options.merge ) {
						// update other model
						existingModel.set( attributes );
						// we're done here
						return existingModel;
					} else {
						// remove other model
						this.remove( existingModel );
					}
				}
			} else {
				// create a unique id
				attributes.id = _.uniqueId();
			}
			// create new model
			var m = new this._options.Model( attributes );

			// register in list only once
			// already check above to see if it exists
			this._models.push( m );
			// tell the model it's a member here
			m.addToCollection( this, options );
			// listen to them
			this.listenTo( m, 'change', this.forwardEvent );
			if ( !options.silent ) {
				this.trigger( 'add', m );
			}

			return m;
		} );
		// sort the models
		if ( this._options.sort ) {
			this._models = this._models.sort( this._options.sort );
			updated = updated.sort( this._options.sort );
		}
		return updated;
	}

	// ---------------------------------------------------

	remove( models, options ) {
		options = options || {};
		// if models isn't an array, make it one
		models = _.isArray( models ) ? models : [ models ];
		_.each( models, ( model ) => {
			// allow ids to be passed
			if ( typeof model !== 'object' ) {
				model = this.get( model );
			}
			var index = this._models.indexOf( model );
			if ( index > -1 ) {
				this.stopListening( model );
				this._models.splice( index, 1 );
				model.removeFromCollection( this, options );
				if ( !options.silent ) {
					this.trigger( 'remove', {
						collection: this,
						model: model
					} );
				}
			}
		} );
		return this;
	}

	// ---------------------------------------------------

	empty( options ) {
		this.remove( this._models, options );
	}

	// ---------------------------------------------------

	get( matchConditions ) {
		// make sure match conditions is an array
		matchConditions = _.isArray( matchConditions ) ? matchConditions : [ matchConditions ];

		// an array of objects is assumed to be a list of match condition objects
		// an array of non-objects is assumed to be a list of ids
		if ( typeof matchConditions[ 0 ] !== 'object' ) {
			// convert to match condition objects
			matchConditions = _.map( matchConditions, ( id ) => {
				return {
					id: id
				};
			} );
		}

		var models = _( matchConditions )
			// for each condition, find a list of models that matches
			.map( ( condition ) => {
				return _.filter( this._models, condition );
			} )
			.flattten()
			// only include models once in list
			.uniq()
			.value();

		if ( models.length === 1 ) {
			return models[ 0 ];
		} else {
			return models;
		}
	}

	// ---------------------------------------------------

	at( index ) {
		return this._models[ index ];
	}

	// ---------------------------------------------------

	fetch( options ) {
		options = options || {};
		// default fetch action is to merge from json api
		// to reset set options.reset = true
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

	toJSON( refs ) {
		return _.map( this._models, ( m ) => m.toJSON( refs ) );
	}

	// ---------------------------------------------------

	getRefs() {
		return _.map( this._models, ( m ) => m.id );
	}

	// ---------------------------------------------------

	// TODO: create wrapped convenience accessor functions from lodash

	// ---------------------------------------------------

	get length() {
		return this._models.length;
	}

	get models() {
		return this._models;
	}

	// ---------------------------------------------------

	set sortBy( attr ) {
		this._options.sort = ( a, b ) => b[ attr ] - a[ attr ];
		return attr;
	}

}

module.exports = Collection;
