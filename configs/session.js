const HOUR = 3600000;
const DAY = HOUR * 24;

exports.default = {
    showLogs: false,
    secret: 'TheAppSecret',
    store: {
        url: 'mongodb://192.168.1.183:27017/msda-sessions-store2-development',
        ttl: HOUR
    }
};
