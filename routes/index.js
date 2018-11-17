'use strict';

const Route = require('@and1gio/z-app-core').Route;
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart({ maxFilesSize: '200MB' });

class IndexRoute extends Route {

    constructor(app) {
        super(app)
    }

    init() {
        // upload file
        this.router.post('/file', multipartMiddleware, this.app.services.file.save);

        // download file
        this.router.get('/file/:fileId', this.app.services.file.downloadFile);

        // get meta information of file
        this.router.get('/file/:fileId/meta', this.app.services.file.getMeta);

        // download picture
        // http://locahost:8000/picture/5ba36255afa8c9ccc1104892?width=400&height=400&crop=MC
        this.router.get('/picture/:fileId', this.app.services.file.downloadPicture);
        
        //http://localhost:8000/picture/5b7bf0a9adc64719f1146d40?width=400&height=400&crop=MC
        return this.router;
    }

}

module.exports = IndexRoute;
