exports.default = function (app) {
    return {
        errorsClient: {
            host: 'bl-s.msda.ge',
            port: '3033',
            path: '/api/'
        }
    }
};

exports.staging = function (app) {
    return {
        errorsClient: {
            host: 'bl-s.msda.ge',
            port: '3033',
            path: '/api/'
        }
    }
};

exports.production = function (app) {
    return {
        errorsClient: {
            host: 'errors.msda.ge',
            port: '80',
            path: '/api/'
        }
    }
};
