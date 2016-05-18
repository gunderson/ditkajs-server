var _ = require( 'lodash' );
var $ = require( 'jquery' );
var TASK = require( './TASK' );

class View extends TASK {
	constructor( options ) {
		super();

		// ---------------------------------------------------

		View.parseName( options );

		// ---------------------------------------------------

		_.extend( this, {
			el: null,
			model: null,
			template: '',
			id: '',
			tagname: '',
			classname: '',
			hasRendered: false,
			loadPromise: null,
			parentView: null,
			views: [
				/*
                    new ChildView0({
                        el: '#child-id-0',
                        model: this.model.widgets.at(0)
                    }),
                    new ChildView1({
                        el: '#child-id-1',
                        model: this.model.widgets.at(1)
                    }), ...
                */
			],
			events: [
				// TODO: change 'selector' to target to allow event delegation to non js elements
				// Helpful for data binding to the model

				/*
				{
                    eventName: 'click',
                    selector: 'button.play',
                    handler: 'handleButtonClick'
				}
				*/
			],
			dataBindings: [
				/*
				{
                    element: '.selector',
                    attributeName: 'name',
                    model: 'model',
					elementChangeEventName: 'change',
					mode: 'get' || 'send'
				}
				*/
			]
		}, options );

		// ---------------------------------------------------
		// Bind Functions

		TASK.bindFunctions( this, [
			'bindData',
			'delegateEvents',
			'destroy',
			'undelegateEvents',
			'render',
			'setupElement'
		] );

		// ---------------------------------------------------
		// Event Handlers


		// ---------------------------------------------------
		// Finish setup

		this.setupElement();
	}

	// ---------------------------------------------------

	static getTemplate( name ) {
		// TEMPLATES is a global object on window
		return name ? TEMPLATES[ name ] : () => '';
	}

	// ---------------------------------------------------

	static parseName( options ) {
		var name = options.name;
		if ( name ) {
			options.el = '#' + name;
			options.route = name.slice( 0, -5 );
		}
		return options;
	}

	// ---------------------------------------------------

	setupElement() {
		// if an el property exists, attempt to find it
		// otherwise, create one
		this.$el = this.el ? $( this.el )
			.first() : $( `<${this.tagname} class='${this.classname}' id='${this.id}' />` );

		this.el = this.$el[ 0 ];
		this.$ = this.$el.find.bind( this.$el );
	}

	// ---------------------------------------------------

	render( parentView ) {
		this.hasRendered = false;
		this.parentView = parentView;
		this.undelegateEvents();
		this.unbindData();
		this.trigger( 'beforeRender', this );

		// put rendered JST template into $el
		if ( this.template ) {
			var html = View.getTemplate( this.template )( this.serialize() );
			this.$el.html( html );
		}
		// render child views
		_.each( this.views, ( v ) => v.render( this ) );

		this.delegateEvents();
		this.bindData();
		this.trigger( 'afterRender', this );
		this.hasRendered = true;
	}

	// ---------------------------------------------------
	// bind the value of an HTMLElement to a model or collection

	createDataBinding( hash ) {
		var attributeName = hash.attributeName;
		var element = hash.element;
		var model = hash.model;
		var elementChangeEventName = hash.elementChangeEventName;
		var mode = hash.mode;

		// parse argument options
		var $element = $( element );
		model = model || this[ model ] || this.model;
		elementChangeEventName = elementChangeEventName || 'change';

		// set listeners
		if ( mode !== 'send' ) this.listenTo( model, `change:${attributeName}`, updateElement );
		if ( mode !== 'get' ) $element.on( elementChangeEventName, updateModel );

		// assign a destroy function for convenient destruction
		hash.unbindData = unbindData.bind( hash );

		return hash;

		function updateElement( event ) {
			$element.val( event.value );
		}

		function updateModel( event ) {
			model[ attributeName ] = $element.val();
		}

		function unbindData() {
			this.stopListening( model, `change:${attributeName}`, updateElement );
			$element.off( elementChangeEventName, updateModel );
			delete this.unbindData;
		}
	}

	// ---------------------------------------------------

	bindData() {
		_.each( this.dataBindings, this.createDataBinding );
		return this;
	}

	// ---------------------------------------------------

	unbindData() {
		_.each( this.dataBindings, ( hash ) => hash.unbindData && hash.unbindData() );
		return this;
	}

	// ---------------------------------------------------

	delegateEvents() {
		_.each( this.events, ( e ) => {
			this.$( e.selector )
				.on( e.eventName, this[ e.handler ] );
		} );
		return this;
	}

	// ---------------------------------------------------

	undelegateEvents() {
		_.each( this.events, ( e ) => {
			this.$( e.selector )
				.off( e.eventName );
		} );
		return this;
	}

	// ---------------------------------------------------

	destroy() {
		this.unbindData();
		this.undelegateEvents();
		this.stopListening();
	}

	// ---------------------------------------------------

	serialize() {
		var model = this.model ? this.model.attributes : {};
		// GLOBALS is a global object on window
		return _.extend( {}, model, GLOBALS );
	}
}

module.exports = View;
