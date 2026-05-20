import { Query } from "mongoose";

class APIFilters {
  private query: Query<any, any>;
  private queryStr: URLSearchParams;

  constructor(query: Query<any, any>, queryStr: URLSearchParams) {
    this.query = query;
    this.queryStr = queryStr;
  }

  searchAllFields(): this {
    const keyword = this.queryStr.get("keyword");

    if (keyword) {
      const searchConditions = {
        $or: [
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          { category: { $regex: keyword, $options: "i" } },
          { gender: { $regex: keyword, $options: "i" } },
          { ASIN: { $regex: keyword, $options: "i" } },
        ],
      };

      const currentFilter = this.query.getFilter();
      // Merge the current filter with the search conditions instead of nesting them
      const newFilter = { ...currentFilter, ...searchConditions };
      this.query = this.query.find(newFilter);
    }

    return this;
  }

  filter(): this {
    const queryCopy: Record<string, string> = {};
    this.queryStr.forEach((value, key) => {
      if (!["keyword", "page", "per_page"].includes(key)) {
        queryCopy[key] = value;
      }
    });

    let output: Record<string, any> = {};
    for (let [key, value] of Object.entries(queryCopy)) {
      if (key.includes("[") && key.includes("]")) {
        const prop = key.split("[")[0];
        const operator = key.match(/\[(.*?)\]/)?.[1];
        if (operator && ["gt", "gte", "lt", "lte"].includes(operator)) {
          if (!output[prop]) output[prop] = {};
          output[prop][`$${operator}`] = value;
        }
      } else {
        output[key] = value;
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

export default APIFilters;
