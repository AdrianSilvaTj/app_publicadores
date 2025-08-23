const DAYS_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
  "Eventual",
];

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/**
 * Parses a date string into a Date object based on the provided format.
 * @param {string} dateString - The date string to be parsed.
 * @param {string} format - The format of the date string (e.g., 'YYYY-MM-DD HH:mm:SS').
 * @returns {Date} - The parsed Date object.
 */
function stringToDateTime(dateString, format) {
  if (!dateString || !format) {
    throw new Error("Invalid Date string");
  }

  // tokens soportados
  const tokens = {
    YYYY: "(\\d{4})",
    MM: "(\\d{2})",
    DD: "(\\d{2})",
    HH: "(\\d{2})",
    mm: "(\\d{2})",
    SS: "(\\d{2})",
  };

  // vamos guardando el orden de aparición
  const usedTokens = [];

  // construir regex dinámico
  let formatRegex = format;
  for (const token in tokens) {
    if (format.includes(token)) {
      formatRegex = formatRegex.replace(token, tokens[token]);
      usedTokens.push(token);
    }
  }

  const regex = new RegExp(`^${formatRegex}$`);
  const match = dateString.match(regex);

  if (!match) {
    throw new Error("Input doesn't match the format");
  }

  // valores por defecto
  let year = 1970,
    month = 0,
    day = 1,
    hour = 0,
    minutes = 0,
    seconds = 0;

  // mapear valores capturados a tokens
  usedTokens.forEach((token, i) => {
    const val = parseInt(match[i + 1], 10);
    switch (token) {
      case "YYYY":
        year = val;
        break;
      case "MM":
        month = val - 1;
        break;
      case "DD":
        day = val;
        break;
      case "HH":
        hour = val;
        break;
      case "mm":
        minutes = val;
        break;
      case "SS":
        seconds = val;
        break;
    }
  });

  // validaciones básicas
  if (
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    throw new Error("Invalid date components.");
  }

  return new Date(year, month, day, hour, minutes, seconds);
}

/**
 * Formats a Date object into a string based on the provided format.
 * @param {Date} date - The Date object to be formatted.
 * @param {string} format - The desired format for the output string (e.g., 'YYYY-MM-DD HH:mm:SS').
 * @returns {string} - The formatted date string.
 */
function dateTimeToString(date, format) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid Date object");
  }

  const components = {
    YYYY: date.getFullYear().toString(),
    MM: (date.getMonth() + 1).toString().padStart(2, "0"),
    DD: date.getDate().toString().padStart(2, "0"),
    HH: date.getHours().toString().padStart(2, "0"),
    mm: date.getMinutes().toString().padStart(2, "0"),
    SS: date.getSeconds().toString().padStart(2, "0"),
  };

  let formattedDate = format;
  for (const key in components) {
    formattedDate = formattedDate.replace(key, components[key]);
  }

  return formattedDate;
}

/**
 * Converts a date string from one format to another.
 * @param {string} dateString - The input date string.
 * @param {string} inputFormat - The format of the input date string (e.g., 'DD/MM/YYYY').
 * @param {string} outputFormat - The desired format for the output string (e.g., 'YYYY-MM-DD').
 * @returns {string | null} - The formatted date string, or null if the input is invalid.
 */
function dateTimeStrToAnother(dateString, inputFormat, outputFormat) {
  const date = stringToDateTime(dateString, inputFormat);
  if (!date) {
    throw new Error("Invalid date string or format");
  }
  return dateTimeToString(date, outputFormat);
}

/**
 * Formats the value of an input date control to a 'YYYY-MM-DD' string.
 * @param {string | Date} date - The date value to be formatted.
 * @returns {string} - The formatted date string in 'YYYY-MM-DD' format.
 */
function formatInputDateControl(date) {
  return new Date(date).toISOString().split("T")[0];
}

/**
 * Adds a specified number of hours to a date.
 * @param {Date} date - The original date.
 * @param {number} hours - The number of hours to add.
 * @returns {Date} - The new Date object with the added hours.
 */
function getDaysDifference(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0;
  }
  const timeDifference = endDate.getTime() - startDate.getTime();
  return timeDifference / (1000 * 60 * 60 * 24);
}

/**
 * Adds a specified number of hours to a date.
 * @param {Date} date - The original date.
 * @param {number} hours - The number of hours to add.
 * @returns {Date} - The new Date object with the added hours.
 */
function addHours(date, hours) {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

/**
 * Adds a specified number of days to a date.
 * @param {Date} date - The original date.
 * @param {number} days - The number of days to add.
 * @returns {Date} - The new Date object with the added days.
 */
function addDays(date, days) {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}
