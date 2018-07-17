'use strict';

const Middleware = require('@and1gio/z-app-core').Middleware;

class ErrorHandler extends Middleware {
    constructor(app) {
        super(app);

        this.app.express.use(this.handler);
    }

    handler(ex, req, res, next) {
        this.app.logger.error("******* ERROR-HANDLER *******", ex);

        if (ex && ex.error && ex.error.code) {
            res.status(ex.error.code).json(ex);
        } else {
            res.status(500).json({
                success: false,
                error: {
                    code: 500,
                    errors: [{
                        keyword: 'INTERNAL_SERVER_ERROR',
                        message: 'INTERNAL_SERVER_ERROR'
                    }]
                }
            });
        }
    }
}

module.exports = ErrorHandler;
