const sharp = require("sharp");

async function preprocessImage(buffer) {
    return await sharp(buffer)
        .resize({ width: 1500, withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .jpeg({ quality: 90 })
        .toBuffer();
}

module.exports = { preprocessImage };