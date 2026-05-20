import { Query } from "mongoose";

class APIPostsFilters {
  private query: Query<any, any>; // Mongoose Query type
  private queryStr: URLSearchParams; // URLSearchParams type

  constructor(query: Query<any, any>, queryStr: URLSearchParams) {
    this.query = query;
    this.queryStr = queryStr;
  }

  searchAllFields(): this {
    const keyword = this.queryStr.get("keyword") || "";

    // Define the conditions to search for the keyword in title, summary, and category
    const searchConditions = {
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { summary: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
      ],
    };

    // Use a temporary variable to hold the conditions
    const tempConditions = keyword
      ? { $and: [this.query.getQuery(), searchConditions] }
      : this.query.getQuery(); // If no keyword, keep existing conditions

    // Set the conditions to this.query
    this.query = this.query.find(tempConditions);

    return this;
  }

  filter(): this {
    const queryCopy: Record<string, string> = {};
    this.queryStr.forEach((value, key) => {
      queryCopy[key] = value;
    });

    const removeFields = ["keyword", "page", "per_page", "id"];
    removeFields.forEach((el) => delete queryCopy[el]);

    let output: Record<string, any> = {};
    for (const key in queryCopy) {
      if (!key.match(/\b(gt|gte|lt|lte)\b/)) {
        output[key] = queryCopy[key];
      } else {
        const prop = key.split("[")[0];
        const operatorMatch = key.match(/\[(.*)\]/);
        const operator = operatorMatch ? operatorMatch[1] : "";

        if (!output[prop]) {
          output[prop] = {};
        }

        output[prop][`$${operator}`] = queryCopy[key];
      }
    }

    this.query = this.query.find(output);

    return this;
  }

  pagination(resPerPage: number, currentPage: number): this {
    const skip = resPerPage * (currentPage - 1);

    this.query = this.query.limit(resPerPage).skip(skip);
    return this;
  }
}

export default APIPostsFilters;
