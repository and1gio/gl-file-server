/**
 *  NODE_ENV = undefined
 */
exports.default = function (app) {
    return {
        mongo: {
            uri: 'mongodb://192.168.1.183/f-storage-development'
        }
    }
};

/**
 *  NODE_ENV = development
 */
exports.development = function (app) {
    return {
        mongo: {
            uri: 'mongodb://192.168.1.183/f-storage-development'
        }
    }
};

/**
 *  NODE_ENV = staging
 */
exports.staging = function (app) {
    return {
        mongo: {
            uri: 'mongodb://192.168.1.183/f-storage-staging'
        }
    }
};

/**
 *  NODE_ENV = production
 */
exports.production = function (app) {
    return {
        mongo: {
            uri: 'mongodb://192.168.1.183/f-storage-production'
        }
    }
};
