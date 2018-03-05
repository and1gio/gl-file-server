exports.default = function (app) {
    return {
        zRoute: {
            rootDir: 'routes',

            routes: {
                /**
                 * example { url-to-bind : module-path }
                 */
                '/api/file': 'api/file'
            }

        }
    }
};
