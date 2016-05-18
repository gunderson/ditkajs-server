var _ = require( '_' );

class Dispatcher {
	constructor() {
		// connect to db server
	}

	register( options ) {
		var defaults = {
			groupid: '0',
			deviceid: '',
			address: '',
			services: []
		}
		options = _.defaults( defaults, options );
	}

	broadcast( options ) {
		var defaults = {
			groupid: '0',
			message: '',
			data: {}
		}
		options = _.defaults( defaults, options );
	}
}

module.exports = Dispatcher;
