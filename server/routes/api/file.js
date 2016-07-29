module.exports = function (app) {

    var multer  = require('multer');
    var upload = multer({ limits: { fileSize: 20000000 }, dest: 'tempFiles/' }); // max 20mb

    app.router.post('/save', upload.single('file'), function (req, res, next) {
        app.apiBL.file.save(req, function(errors, data){
            errors ? next(errors) : res.json(data);
        });
    });

    app.router.post('/get', function (req, res, next) {
        app.apiBL.file.get(req, function(errors, data){
            errors ? next(errors) : data.stream.pipe(res);
        });
    });

    app.router.post('/get/image', function (req, res, next) {
        app.apiBL.file.getImage(req, function(errors, data){
            errors ? next(errors) : data.stream.pipe(res);
        });
    });

    return app.router;
};