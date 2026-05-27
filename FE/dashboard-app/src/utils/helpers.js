/* utils/helpers.js */
"use strict";

/**
 * Formats a Date object to "HH:MM:SS YYYY/MM/DD" string.
 * @param {Date} date 
 * @returns {string}
 */
export function formatTimestamp(date) {
    const pad = (num) => String(num).padStart(2, '0');
    const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    const dateStr = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
    return `${timeStr} ${dateStr}`;
}
