/**
 * Replaces an item in an array based on a matching field value.
 *
 * @param {Object[]} arr - The array to search and update.
 * @param {string} search_field - The key in each object to compare.
 * @param {*} search_value - The value to match against the field.
 * @param {Object} newValue - The new item to replace the matched one.
 * @returns {Object[] | null} The modified array or null if not found.
 *
 * @example
 * const users = [{ id: 1 }, { id: 2 }];
 * replaceInArray(users, 'id', 2, { id: 2, name: 'John' });
 */
function replaceInArray(arr, search_field, search_value, newValue) {
  const index = arr.findIndex((item) => item?.[search_field] === search_value);

  if (index === -1) return null;

  arr[index] = newValue;
  return arr;
}

/**
 * Sorts an array of objects based on a specific object property.
 *
 * @param {Object[]} array - The array of objects to sort.
 * @param {string} field - The object property to sort by.
 * @param {'asc'|'desc'} [order='asc'] - Sorting order.
 * @returns {Object[]} A new sorted array.
 *
 * @example
 * orderArray(users, 'age', 'asc');
 * orderArray(users, 'name', 'desc');
 */
function orderArray(array, field, order = "asc") {
  return [...array].sort((a, b) => {
    const valueA = a?.[field];
    const valueB = b?.[field];

    const aHas = valueA !== null && valueA !== undefined;
    const bHas = valueB !== null && valueB !== undefined;

    // Handle missing values
    if (aHas !== bHas) {
      return aHas ? -1 : 1;
    }

    if (!aHas && !bHas) return 0;

    if (typeof valueA === "string" && typeof valueB === "string") {
      return order === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }

    if (typeof valueA === "number" && typeof valueB === "number") {
      return order === "asc" ? valueA - valueB : valueB - valueA;
    }

    return 0;
  });
}
