'use strict';

exports.default = {
    viewEngine: {
        enabled: false,
        type: 'pug'
    },
    staticFolder: {
        enabled: false
    },
    bodyParser: {
        json: null,
        urlencoded: {
            extended: false
        }
    },
    cookieParser: null
};
