'use strict';

module.exports = function (app) {
    return {
        example1: function (req, res, next) {
            if (req.body.test) {
                next();
            } else {
                res.json({test: false});
            }
        },
        example2: function(data, req, res, next){
            app.logger.info(data);
            next();
        },
        incomingDataLogger: function (data, req, res, next) {
            app.logger.info(data, req.body);

            if(data === "chveni loggeri"){
                return res.json({"a": "asdasda"})
            }

            next();
        }
    }
};
