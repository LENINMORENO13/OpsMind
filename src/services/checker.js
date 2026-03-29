const axios = require("axios");

const check = async (url) => {
  try {
    const response = await axios.get(url);

    return {
      url: url,
      online: response.status >= 200 && response.status < 300,
      status: response.status,
    };
  } catch (error) {
    console.log("Error checking URL:", error.message);

    return {
      url: url,
      online: false,
      status: error.response ? error.response.status : 0,
    };
  }
};

module.exports = { check };
