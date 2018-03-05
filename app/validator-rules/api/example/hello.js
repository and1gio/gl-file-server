module.exports = function (app) {
    return {
        body: {
            "data": {
                presence: {
                    message: "^REQUIRED"
                }
            },
            "data.name": {
                presence: {
                    message: "^REQUIRED"
                },
                inclusion: {
                    within : ['GIORGIO', 'DITRIX'],
                    message: "^INVALID_VALUE"
                }
            }
        },
        params: {
            "id": {
                presence: {
                    message: "^REQUIRED"
                }
            },
            "type": {
                presence: {
                    message: "^REQUIRED"
                }
            }
        },
        query: {
            "orderBy": {
                presence: {
                    message: "^REQUIRED"
                }
            }
        }
    };
};
