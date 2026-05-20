import { createHash } from "crypto";

export const cx = (...classNames) => classNames.filter(Boolean).join(" ");

export const isValidEmail = (email) => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return emailRegex.test(email);
};

export const generateCodeChallenge = async () => {
  // Generate a code challenge from the code verifier
  const codeVerifier =
    process.env.NEXT_PUBLIC_MERCADO_LIBRE_CHALLENGE.toString("hex");
  const codeChallengeSha256 = createHash("sha256")
    .update(codeVerifier)
    .digest("hex");

  return codeChallengeSha256;
};

export function removeUndefinedAndPageKeys(obj) {
  // Iterate through each key in the object
  for (const key in obj) {
    // Check if the value of the current key is undefined or if the key is 'page'
    if (obj[key] === undefined || key === "page") {
      // If it is undefined or the key is 'page', delete the key from the object
      delete obj[key];
    }
  }
  // Return the modified object
  return obj;
}

export function generateUrlSafeTitle(title) {
  // Convert the title to lowercase and replace spaces with dashes
  let urlSafeTitle = title.toLowerCase().replace(/\s+/g, "-");

  // Remove special characters and non-alphanumeric characters
  urlSafeTitle = urlSafeTitle.replace(/[^\w-]+/g, "");

  return urlSafeTitle;
}

export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+\d{2}\s?)?(\d{3}[-\s]?\d{3}[-\s]?\d{4})$/;
  return phoneRegex.test(phone);
};

export const sortBlogs = (blogs) => {
  return blogs.slice().sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);

    // Compare dates in descending order
    if (dateA > dateB) {
      return -1;
    } else if (dateA < dateB) {
      return 1;
    } else {
      return 0;
    }
  });
};

export const calculatePercentage = (oldPrice, price) => {
  return !!parseFloat(price) && !!parseFloat(oldPrice)
    ? (100 - (oldPrice / price) * 100).toFixed(0)
    : 0;
};

export const getPriceQueryParams = (queryParams, key, value) => {
  const hasValueInParam = queryParams.has(key);

  if (value && hasValueInParam) {
    queryParams.set(key, value);
  } else if (value) {
    queryParams.append(key, value);
  } else if (hasValueInParam) {
    queryParams.delete(key);
  }
  return queryParams;
};

export function newCSTDate() {
  // Create a Date object from the given string
  const currentDate = new Date();
  // Adjust the date object to the Central Standard Time (CST) time zone
  const cstOffset = -6 * 60 * 60 * 1000; // CST is UTC-6
  const cstDateTime = new Date(currentDate.getTime() + cstOffset);

  return cstDateTime;
}

export function cstDateTime() {
  // Create a Date object from the given string
  const currentDate = new Date();
  let cstTime;
  let cstDate;
  if (process.env.NODE_ENV === "development") {
    // Adjust the date object to the Central Standard Time (CST) time zone
    const cstOffset = -6 * 60 * 60 * 1000; // CST is UTC-6
    cstTime = new Date(currentDate.getTime() + cstOffset);
    cstDate = cstTime.toLocaleString("en-US", {
      timeZone: "America/Mexico_City",
    });
  }

  if (process.env.NODE_ENV === "production") {
    cstTime = new Date(currentDate.getTime());
    cstDate = cstTime.toLocaleString("en-US", {
      timeZone: "America/Mexico_City",
    });
  }

  return cstDate;
}

export function formatSpanishDate(inputDate) {
  // Parse the input date string
  const date = new Date(inputDate);
  let cstOffset;
  let cstDate;
  if (process.env.NODE_ENV === "development") {
    cstOffset = 6 * 60 * 60 * 1000; // CST is UTC-6
    cstDate = new Date(date.getTime() + cstOffset);
  } else if (process.env.NODE_ENV === "production") {
    cstOffset = -6 * 60 * 60 * 1000; // CST is UTC-6
    cstDate = new Date(date.getTime() - cstOffset);
  }

  // Define arrays for month names in Spanish and AM/PM labels
  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const periodLabels = ["AM", "PM"];

  // Get the day, month, year, hours, and minutes from the adjusted date object
  const day = cstDate.getDate();
  const month = monthNames[cstDate.getMonth()];
  const year = cstDate.getFullYear();
  let hours = cstDate.getHours();
  const minutes = String(cstDate.getMinutes()).padStart(2, "0");

  // Determine the period label (AM/PM) based on the hour value
  const period = hours < 12 ? 0 : 1;

  // Convert hours to 12-hour format
  hours = hours % 12 || 12;

  // Construct the formatted string
  const formattedDate = `${day} de ${month} de ${year} a las ${hours}:${minutes} ${periodLabels[period]}`;

  return formattedDate;
}

export function formatCorteDate(inputDate) {
  // Parse the input date string
  const date = new Date(inputDate);
  let cstOffset;
  let cstDate;
  if (process.env.NODE_ENV === "development") {
    cstOffset = 6 * 60 * 60 * 1000; // CST is UTC-6
    cstDate = new Date(date.getTime() + cstOffset);
  } else if (process.env.NODE_ENV === "production") {
    cstOffset = -6 * 60 * 60 * 1000; // CST is UTC-6
    cstDate = new Date(date.getTime() - cstOffset);
  }

  // Define arrays for month names in Spanish and AM/PM labels
  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  // Get the day, month, year, hours, and minutes from the adjusted date object
  const day = cstDate.getDate();
  const month = monthNames[cstDate.getMonth()];
  const year = cstDate.getFullYear();

  // Construct the formatted string
  const formattedDate = `${day} de ${month} de ${year}`;

  return formattedDate;
}

export function formatSimpleDate(inputDate) {
  // Parse the input date string
  const date = new Date(inputDate);
  let cstOffset;
  let cstDate;
  if (process.env.NODE_ENV === "development") {
    cstOffset = 6 * 60 * 60 * 1000; // CST is UTC-6
    cstDate = new Date(date.getTime() + cstOffset);
  } else if (process.env.NODE_ENV === "production") {
    cstOffset = -6 * 60 * 60 * 1000; // CST is UTC-6
    cstDate = new Date(date.getTime() - cstOffset);
  }

  // Define arrays for month names in Spanish and AM/PM labels
  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  // Get the day, month, year, hours, and minutes from the adjusted date object
  const day = cstDate.getDate();
  const month = monthNames[cstDate.getMonth()];
  const year = cstDate.getFullYear();

  // Construct the formatted string
  const formattedDate = `${day}/${month.substring(0, 3)}/${year}`;

  return formattedDate;
}

export function cstDateTimeClient() {
  // Create a Date object from the given string
  const date = new Date();

  return date;
}
export function formatDate(dateTimeString) {
  // Create a Date object from the given string
  const date = new Date(dateTimeString);

  // Format the date in the desired format
  const formattedDate = date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format the time in the desired format
  const formattedTime = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return formattedDate;
}

export function formatTime(dateTimeString) {
  // Create a Date object from the given string
  const date = new Date(dateTimeString);

  // Format the time in the desired format
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return formattedTime;
}

export function getTotalFromItems(orderItems) {
  // Use reduce to sum up the 'total' field
  const totalAmount = orderItems?.reduce(
    (acc, orderItem) => acc + orderItem.quantity * orderItem.price,
    0
  );

  return totalAmount;
}

export function getQuantitiesFromItems(orderItems) {
  // Use reduce to sum up the 'quantity' fields
  const totalQuantity = orderItems.reduce((sum, obj) => sum + obj.quantity, 0);
  return totalQuantity;
}

export function getOrderItemsQuantities(orderItems) {
  // Use reduce to sum up the 'quantity' fields
  const totalQuantity = orderItems?.reduce((sum, obj) => sum + obj.quantity, 0);
  return totalQuantity;
}

export const getCookiesName = () => {
  let cookieName = "";

  if (process.env.NODE_ENV === "development") {
    cookieName = "next-auth.csrf-token";
  }

  if (process.env.NODE_ENV === "production") {
    cookieName = "__Host-next-auth.csrf-token";
  }

  return cookieName;
};

export const getSessionCookiesName = () => {
  let cookieName = "";

  if (process.env.NODE_ENV === "development") {
    cookieName = "next-auth.session-token";
  }

  if (process.env.NODE_ENV === "production") {
    cookieName = "__Secure-next-auth.session-token";
  }

  return cookieName;
};

function getRandomChar(charset) {
  const randomIndex = Math.floor(Math.random() * charset.length);
  return charset.charAt(randomIndex);
}

export function generateRandomPassword(length) {
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numberChars = "0123456789";
  const specialChars = "!@#$%&*-_=+";

  let password = "";

  // Ensure at least one character from each category
  password += getRandomChar(lowercaseChars);
  password += getRandomChar(uppercaseChars);
  password += getRandomChar(numberChars);
  password += getRandomChar(specialChars);

  // Fill the remaining length with random characters
  for (let i = 4; i < length; i++) {
    const randomIndex = Math.floor(
      Math.random() *
        (lowercaseChars.length +
          uppercaseChars.length +
          numberChars.length +
          specialChars.length)
    );
    const randomChar =
      randomIndex < lowercaseChars.length
        ? lowercaseChars.charAt(randomIndex)
        : randomIndex < lowercaseChars.length + uppercaseChars.length
        ? uppercaseChars.charAt(randomIndex - lowercaseChars.length)
        : randomIndex <
          lowercaseChars.length + uppercaseChars.length + numberChars.length
        ? numberChars.charAt(
            randomIndex - lowercaseChars.length - uppercaseChars.length
          )
        : specialChars.charAt(
            randomIndex -
              lowercaseChars.length -
              uppercaseChars.length -
              numberChars.length
          );
    password += randomChar;
  }

  // Shuffle the password to make the order random
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return password;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
