const getFormattedDate = () => {
  return new Date().toLocaleString("ec-EC", { timeZone: "America/Guayaquil" });
};

module.exports = { getFormattedDate };

