const checker = require("../services/checker.js");
const analyzer = require("../services/analyzer.js");
const config = require("../config.json");
const historyService = require("../services/historyService.js");

const processUrl = async (url) => {
  try {
    const response = await checker.check(url);
    historyService.save(url, response.status);
    const history = historyService.getHistory(url);

    const analysis = analyzer.analyzeStatus(response, history);

    return analysis;
  } catch (error) {
    historyService.save(url, 0);
    return {
      url,
      error: true,
      message: "Connection failed",
    };
  }
};

const getStatus = async (req, res) => {
  try {
    const results = [];
    for (const url of config.urls) {
      const statusResult = await processUrl(url);
      results.push(statusResult);
    }
    return res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const getStatusOne = async (req, res) => {
  const { site } = req.params;
  try {
    const targetUrl = config.urls.find((url) =>
      url.toLowerCase().includes(site.toLowerCase()),
    );

    if (!targetUrl) {
      return res.status(404).json({ error: "Site not monitored" });
    }

    const result = await processUrl(targetUrl);
    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Error processing request" });
  }
};

module.exports = { getStatus, getStatusOne };
