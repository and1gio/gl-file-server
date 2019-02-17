const Route = require('@and1gio/z-app-core').Route;
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart({ maxFilesSize: '500MB' });

class IndexRoute extends Route {

    constructor(app) {
        super(app)
    }

    init() {
        // upload file
        this.router.post('/file', multipartMiddleware, this.app.services.file.save);

        // upload & commit file
        this.router.post('/file/commit', multipartMiddleware, this.app.services.file.saveAndCommit);

        // commit file
        this.router.put('/file/:fileId/commit', this.app.services.file.commit);

        // download file
        this.router.get('/file/:fileId', this.app.services.file.downloadFile);

        // get meta information of file
        this.router.get('/file/:fileId/meta', this.app.services.file.getMeta);

        // download picture
        // http://locahost:8000/picture/5ba36255afa8c9ccc1104892?width=400&height=400&crop=MC
        // http://localhost:8000/picture/5b7bf0a9adc64719f1146d40?width=400&height=400&crop=MC
        // http://localhost:8000/file/5b7bf0a9adc64719f1146d40/picture?width=400&height=400&crop=MC
        this.router.get('/file/:fileId/picture', this.app.services.file.downloadPicture);

        return this.router;
    }

}

module.exports = IndexRoute;
