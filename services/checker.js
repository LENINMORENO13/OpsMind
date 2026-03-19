const axios = require('axios')

const revisar = async (url) => {
  try {
    const res = await axios.get(url);
    if (res.status >= 200 && res.status < 300) {
      return { url: url, online: true, status: res.status };
    }
  } catch (error) {
    return { url: url, online: false, status: error.response ? error.response.status : 'Error de conexion' };
  }
};


module.exports = { revisar };