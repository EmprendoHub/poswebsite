import { Query } from "mongoose";

class APIPaymentsFilters {
  private query: Query<any, any>; // Mongoose Query type
  private queryStr: URLSearchParams; // URLSearchParams type

  constructor(query: Query<any, any>, queryStr: URLSearchParams) {
    this.query = query;
    this.queryStr = queryStr;
  }

  filter(): this {
    const queryCopy: Record<string, string> = {};
    this.queryStr.forEach((value, key) => {
      queryCopy[key] = value;
    });

    const removeFields = ["branch", "paid", "page", "per_page"];
    removeFields.forEach((el) => delete queryCopy[el]);

    const output: Record<string, any> = {};
    for (const key in queryCopy) {
      if (key.match(/\b(gt|gte|lt|lte)\b/)) {
        const prop = key.split("[")[0]; // Extract field name (e.g., 'createdAt')
        const operatorMatch = key.match(/\[(.*)\]/);
        const operator = operatorMatch ? operatorMatch[1] : ""; // Extract operator (e.g., 'gte')

        if (!output[prop]) {
          output[prop] = {};
        }

        // Convert the date string to a Date object for MongoDB
        output[prop][`$${operator}`] = new Date(queryCopy[key]);
      } else {
        output[key] = queryCopy[key];
      }
    }

    this.query = this.query.find(output);

    return this;
  }
}

export default APIPaymentsFilters;
