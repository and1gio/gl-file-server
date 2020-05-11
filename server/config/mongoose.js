/**
 *  Development Environment
 */
exports.default = function (app) {
    return {
        mongoose: {
            uri: 'mongodb://192.168.3.2:27017/fs-person-images?replicaSet=replica01'
        }
    }
};

/**
 *  Staging Environment
 */
exports.staging = function (app) {
    return {
        mongoose: {
            uri: 'mongodb://192.168.3.2:27017/fs-person-images?replicaSet=replica01'
        }
    }
};

/**
 *  Production Environment
 */
exports.production = function (app) {
    return {
        mongoose: {
            uri: 'mongodb://192.168.3.2:27017/fs-person-images?replicaSet=replica01'
        }
    }
};
