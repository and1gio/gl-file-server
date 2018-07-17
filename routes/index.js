'use strict';

const Route = require('@and1gio/z-app-core').Route;
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart({ maxFilesSize: '200MB' });

class IndexRoute extends Route {

    constructor(app) {
        super(app)
    }

    init() {
        this.router.post('/file', multipartMiddleware, this.app.services.file.save);
        
        this.router.get('/file/:fileId', multipartMiddleware, this.app.services.file.find);

        return this.router;
    }

}

module.exports = IndexRoute;
