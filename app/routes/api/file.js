'use strict';

module.exports = function (app) {

    var router = require('express').Router();
    var multer = require('multer');

    var upload = multer({
        limits: {
            fileSize: app.config.storage.maxFileSize
        },
        dest: app.config.storage.tempDir
    });

    router.post('/save', upload.single('file'), function (req, res, next) {
        app.zService.file.save(req, function (errors, data) {
            errors ? next(errors) : res.json({result: {data: data}}); // [data]
        });
    });

    router.post('/get', function (req, res, next) {
        app.zService.file.get(req, function (errors, stream) {
            if (errors) {
                next(errors);
            } else {
                stream.pipe(res);
            }
        });
    });

    router.post('/get/image', function (req, res, next) {
        app.zService.file.getImage(req, function (errors, data) {
            if (errors) {
                next(errors);
            } else {
                res.set('content-type', data.metaData.mimeType);
                res.set('original-name', data.metaData.originalName);
                data.stream.pipe(res);
            }
        });
    });

    router.post('/get/meta', function (req, res, next) {
        app.zService.file.getMeta(req, function (errors, data) {
            errors ? next(errors) : res.json({result: {data: data}});
        });
    });

    return router;
};
