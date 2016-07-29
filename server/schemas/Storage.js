module.exports = function (app) {
    var mongoose = app.db.mongoose;

    var ObjectId = mongoose.Schema.Types.ObjectId;

    /**
     *  buffer : defines how much free space should be left untouched on the storage
     */
    var Storage = mongoose.Schema({
        name: {type: String, allowNull: false, unique: true},
        path: {type: String, allowNull: false, unique: true},
        readActive: {type: Boolean, allowNull: false},
        writeActive: {type: Boolean, allowNull: false},
        buffer: {type: Number, default: (100 * 1024 * 1024)},
        recordState: {type: Number, required: true, default: 1}
    });

    Storage.statics.getById = function (id, cb) {
        this.findOne({_id: id, recordState: 1})
            .populate("server")
            .exec(function (error, response) {
                cb(error, response);
            });
    };

    Storage.statics.getWriteActive = function (cb) {
        this.find({writeActive: true, recordState: 1}, function (error, response) {
            cb(error, response);
        });
    };

    mongoose.model('Storage', Storage);
    app.db.models.Storage = mongoose.model('Storage');
};
