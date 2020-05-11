exports.default = function (app) {
    return {
        express: {
            port: 8080
        }
    }
};

exports.staging = function (app) {
    return {
        express: {
            port: 8080
        }
    }
};

exports.production = function (app) {
    return {
        express: {
            port: 8080
        }
    }
};