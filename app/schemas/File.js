module.exports = function (app) {
    var mongoose = app.mongo.mongoose;

    var ObjectId = mongoose.Schema.Types.ObjectId;

    var File = mongoose.Schema({
        name: {type: String, required: true},
        storageId: {type: ObjectId, required: true},
        path: {type: String, required: true},
        mimeType: {type: String, default: null},
        encoding: {type: String, default: null},
        filePath: {type: String, required: true},
        size: {type: Number, required: true},
        key: {type: String, default: null},
        createdAt: {
            type: Date, default: function () {
                return new Date();
            }
        },
        recordState: {type: Number, required: true, default: 0} // 0: draft, 1: committed, 2: file deleted from storage
    });

    File.statics.get = function (id, key, cb) {
        this.find({_id: id, recordState: { $in: [0, 1] }, $or: [{key: key}, {key: null}]}, function (err, res) {
            if (!res || res.length !== 1) {
                return cb({keyword: 'FILE_WITH_ID_NOT_FOUND'}, null);
            }
            cb(null, res[0]);
        });
    };

    mongoose.model('File', File);
    return mongoose.model('File');
};