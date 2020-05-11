exports.default = function( app ){
    return {
        translateClient: {
            host:      'bl-s.msda.ge',
            port:      '3032',
            path:      '/api/',
            languages: [ "ge", "en" ]
        }
    }
};

exports.staging = function( app ){
    return {
        translateClient: {
            host:      'bl-s.msda.ge',
            port:      '3032',
            path:      '/api/',
            languages: [ "ge", "en" ]
        }
    }
};

exports.production = function( app ){
    return {
        translateClient: {
            host:      'translations.msda.ge',
            port:      '80',
            path:      '/api/',
            languages: [ "ge", "en" ]
        }
    }
};
