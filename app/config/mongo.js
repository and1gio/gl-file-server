/**
 *  NODE_ENV = undefined
 */
exports.default = function (app) {
    return {
        mongo: {
            uri: 'mongodb://192.168.1.183/f-storage'
        }
    }
};
