export const getFormattedDate = (): string => {
  return new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" });
};



