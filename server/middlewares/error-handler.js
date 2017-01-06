module.exports = function (app) {
    app.express.use(function (err, req, res, next) {
        console.log("******* ERROR-HANDLER *******");
        console.log(err);
        console.log("******* ERROR-HANDLER *******");

        res.json({
            result: {
                error: err
            }
        });
    });
};
