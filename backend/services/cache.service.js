const crypto = require("crypto");

const cache = new Map();

function generateHash(buffer) {
    return crypto.createHash("md5").update(buffer).digest("hex");
}

function getCache(hash) {
    return cache.get(hash);
}

function setCache(hash, data) {
    cache.set(hash, data);
}

module.exports = { generateHash, getCache, setCache };