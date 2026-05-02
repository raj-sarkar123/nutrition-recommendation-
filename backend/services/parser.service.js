async function parseGeminiResponse(rawText, retryFn) {
    try {
        const cleaned = rawText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(cleaned);

    } catch (err) {
        console.log("⚠️ JSON failed, retrying...");

        const fixed = await retryFn(rawText);

        const cleaned = fixed
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(cleaned);
    }
}

module.exports = { parseGeminiResponse };