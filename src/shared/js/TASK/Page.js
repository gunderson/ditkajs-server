var _ = require( 'lodash' );
var $ = require( 'jquery' );
var TaskView = require( './View' );
var TweenMax = require( 'TweenMax' );

var PAGE_TRANSITION_DURATION = 1.5;

class Page extends TaskView {
	constructor( options ) {

		// ---------------------------------------------------
		// Local Properties

		super( _.extend( {
			col: 0,
			row: 0,
			page: null,
			name: '',
			loadType: 'page',
			layerAnimationOffset: 0.25
		}, options ) );


		// ---------------------------------------------------
		// Bind Functions

		TaskView.bindFunctions( this, [
			'fetch',
			'loadAssets',
			'onRoute',
			'transitionIn',
			'transitionOut',
			'transitionInComplete',
			'transitionOutComplete'
		] );

		// ---------------------------------------------------
		// Event Handlers

		this.on( 'transitionInComplete', this.transitionInComplete );
		this.on( 'transitionOutComplete', this.transitionOutComplete );
	}

	loadAssets() {
		var deferred = $.Deferred();
		// load stuff in here
		// resolve the deferred when load is complete
		deferred.resolve();
		return deferred;
	}

	fetch( params, promise ) {

		promise = promise || new $.Deferred();

		var recallFetch = function() {
			this.fetch( params, promise );
			return promise;
		}.bind( this );

		// first load the model if there is one
		if ( false && this.model && this.model.url ) {
			console.log( this.el.id + ' fetching the model' );
			this.loadPromise = this.model.fetch()
				.done( recallFetch );

			// then render
		} else if ( !this.hasRendered ) {
			console.log( this.el.id + ' render' );
			this.render();
			recallFetch();
			// then wait for the components to load
		} else if ( this.loadPromise && this.loadPromise.state() === 'pending' ) {
			console.log( this.el.id + ' waiting for load' );
			this.trigger( 'loadStart', {
				type: this.loadType,
				id: this.route
			} );

			this.loadAssets();
			this.loadPromise
				.then( recallFetch );

			// then you're good to go
		} else {

			console.log( this.el.id + ' finished fetching view' );
			if ( this.loadPromise ) {
				console.log( this.el.id, this.loadPromise.state() );
			}
			_.defer( function() {
				promise.resolve();
			} );
			this.trigger( 'fetchComplete', this );
			this.trigger( 'loadComplete', {
				type: 'page',
				id: this.name
			} );

		}

		return promise;

	}

	onRoute( route ) {
		var prevRoute = route.prevRoute;

		var currentPage = this.page;
		var newPage = null;

		// console.log( this, route, prevRoute );

		// only change pages if new base-route is different from the last
		if ( route.parts.length > 0 && route.parts[ 0 ] !== prevRoute.parts[ 0 ] ) {

			// remove the old page
			$( 'html' )
				.removeClass( prevRoute.parts[ 0 ] + '-page' );

			if ( route ) {
				$( 'html' )
					.addClass( route.parts[ 0 ] + '-page' );

				// determine new page
				newPage = _.find( this.views, {
					name: route.parts[ 0 ] + '-page'
				} );
			}

			// if the route doesn't match any pages, do nothing
			if ( !newPage ) return;

			newPage.fetch( route )
				.done( () => {
					this.trigger( 'loadEnd' );

					if ( currentPage ) {
						currentPage.transitionOut( newPage );
					}

					var subRoute = _.cloneDeep( route );
					subRoute.parts.slice( 1 );
					subRoute.prevRoute.parts.slice( 1 );

					newPage.transitionIn( currentPage, subRoute );

					if ( subRoute.parts.length > 0 ) {
						// this means it's a sub-route, recurse child pages
						newPage.onRoute( subRoute );
					}
				} );

			this.page = newPage;
		} else if ( route.parts.length === 0 && currentPage ) {
			// currentPage.transitionOut();

		} else if ( route.parts.length > 0 && currentPage ) {
			// it's probably a sub-page
			// tell the current page to display the new info
			currentPage.onRoute( route );
		}
	}

	clearSubPage() {

	}

	transitionIn( prev ) {
		this.$( '.cover' )
			.on( 'mousewheel', function( e ) {
				e.preventDefault();
			} );

		this.$el.addClass( 'active' );
		this.$el.find( '>.content' )
			.scrollTop( 0 );

		if ( !prev ) {
			// console.log('No Previous Page');
			this.$el.show();
			TweenMax.to( this.$( '.cover' ), 0, {
				autoAlpha: 0
			} );
			this.trigger( 'transitionInComplete' );
			return this;
		}

		// hide the cover
		TweenMax.fromTo( this.$( '.cover' ), PAGE_TRANSITION_DURATION, {
			autoAlpha: 1
		}, {
			autoAlpha: 0,
			ease: 'Power4.easeOut',
			overwrite: true
		} );


		var startX = 0,
			startY = 0;

		if ( this.col < prev.col ) {
			startX = '-100';
			// this.app.media.playSound( 'page-forward' );
		} else if ( this.col > prev.col ) {
			startX = '100';
			// this.app.media.playSound( 'page-back' );
		} else if ( this.row < prev.row ) {
			startY = '100';
		} else if ( this.row > prev.row ) {
			startY = '-100';
		}

		// animate page layer
		TweenMax.fromTo( this.$el, PAGE_TRANSITION_DURATION, {
			display: 'block',
			x: startX + '%',
			y: startY + '%'
		}, {
			x: '0%',
			y: '0%',
			ease: 'Power4.easeOut',
			onComplete: () => {
				this.$el.css( {
					transform: ''
				} );
				this.trigger( 'transitionInComplete' );
			},
			overwrite: true
		} );

		// animate content layer
		TweenMax.fromTo( this.$el.find( '> .content' ), PAGE_TRANSITION_DURATION, {
			x: ( startX * this.layerAnimationOffset ) + '%',
			y: ( startY * this.layerAnimationOffset ) + '%'
		}, {
			x: '0%',
			y: '0%',
			ease: 'Power4.easeOut',
			overwrite: true
		} );

		return [ startX, startY ];
	}

	transitionOut( next ) {
		this.$el.removeClass( 'active' );
		this.$( '.cover' )
			.off( 'mousewheel' );
		TweenMax.fromTo( this.$( '.cover' ), PAGE_TRANSITION_DURATION, {
			autoAlpha: 0
		}, {
			autoAlpha: 1,
			ease: 'Power4.easeOut',
			overwrite: true
		} );


		var endX = 0,
			endY = 0;

		// transition out to the right by default
		if ( !next || this.col > next.col ) {
			endX = '100';
		} else if ( this.col < next.col ) {
			endX = '-100';
		} else if ( this.row < next.row ) {
			endY = '100';
		} else if ( this.row > next.row ) {
			endY = '-100';
		}

		// animate page layer
		TweenMax.fromTo( this.$el, PAGE_TRANSITION_DURATION, {
			// display: 'block',
			x: '0%',
			y: '0%'
		}, {
			x: endX + '%',
			y: endY + '%',
			ease: 'Power4.easeOut',
			onComplete: () => {
				this.$el.hide();
				this.trigger( 'transitionOutComplete' );
			},
			overwrite: true
		} );

		// animate content layer
		TweenMax.fromTo( this.$el.find( '> .content' ), PAGE_TRANSITION_DURATION, {
			// display: 'block',
			x: '0%',
			y: '0%'
		}, {
			x: ( endX * this.layerAnimationOffset ) + '%',
			y: ( endY * this.layerAnimationOffset ) + '%',
			ease: 'Power4.easeOut',
			overwrite: true
		} );

		return [ endX, endY ];
	}

	transitionInComplete() {}

	transitionOutComplete() {

		this.$el.css( {
			transform: ''
		} );
		this.$el.find( '>.content' )
			.scrollTop( 0 );


		this.$( '.cover' )
			.off( 'mousewheel' );
	}
}

module.exports = Page;
