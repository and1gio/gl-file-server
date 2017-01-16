module.exports = function (app) {

    var multer = require('multer');
    var upload = multer({limits: {fileSize: 300000000}, dest: 'tempFiles/'}); // max 300mb - strange

    app.router.post('/save', upload.single('file'), function (req, res, next) {
        app.apiBL.file.save(req, function (errors, data) {
            // TODO - convert { data: [data] }
            errors ? next(errors) : res.json({result: {data: data}});
        });
    });

    app.router.post('/get', function (req, res, next) {
        app.apiBL.file.get(req, function (errors, data) {
            if (errors) {
                next(errors);
            } else {
                res.set('content-type', data.metaData.mimeType);
                res.set('original-name', new Buffer(data.metaData.originalName).toString('base64'));
                data.stream.pipe(res);
            }
        });
    });

    app.router.post('/get/image', function (req, res, next) {
        app.apiBL.file.getImage(req, function (errors, data) {
            if (errors) {
                next(errors);
            } else {
                res.set('content-type', data.metaData.mimeType);
                res.set('original-name', new Buffer(data.metaData.originalName).toString('base64'));
                data.stream.pipe(res);
            }
        });
    });

    app.router.post('/get/meta', function (req, res, next) {
        app.apiBL.file.getMeta(req, function (errors, data) {
            errors ? next(errors) : res.json({result: {data: data}});
        });
    });

    return app.router;
};