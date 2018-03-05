'use strict';

module.exports = function (app) {

    app.express.use(function (errors, req, res, next) {
        console.log("******* ERROR-HANDLER *******");
        console.log(errors);
        console.log("******* ERROR-HANDLER *******");

        if(errors && typeof errors instanceof Array){
            errors = app.zErrorsClient.getErrors(errors);
        }

        res.json({
            result: {
                errors: errors
            }
        });
    });
};

