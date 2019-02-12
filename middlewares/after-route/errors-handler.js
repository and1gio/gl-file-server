'use strict';

const Middleware = require('@and1gio/z-app-core').Middleware;
const Handle = require('@and1gio/z-app-core').Handle;

class ErrorHandler extends Middleware {
    constructor(app) {
        super(app);

        this.app.express.use(this.handler);
    }

    handler(ex, req, res, next) {
        this.app.logger.error("******* ERROR-HANDLER *******", ex);
        res.status(500).json({
            errors: [{ keyword: 'internal_server_error' }]
        });
    }
}

module.exports = ErrorHandler;
