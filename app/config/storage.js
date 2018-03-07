/**
 *  NODE_ENV = undefined
 */
exports.default = function (app) {
    return {
        storage: {
            maxFileSize: 10000000, // bytes (10 000 000 bytes === 1 mb)
            tempDir: './tempFiles/'
        }
    }
};
