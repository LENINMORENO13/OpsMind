const historyRecords = {};

const save = (url, status) => {
  historyRecords[url] = historyRecords[url] || [];

  historyRecords[url].push(status);

  // Límite de 5 registros
  if (historyRecords[url].length > 5) {
    historyRecords[url].shift();
  }
};

const getHistory = (url) => {
  if (!historyRecords[url]) {
    return [];
  }
  return historyRecords[url];
};

module.exports = { save, getHistory };
