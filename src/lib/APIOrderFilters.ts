import { Query } from "mongoose";

class APIOrderFilters {
  private query: Query<any, any>; // Mongoose Query type
  private queryStr: URLSearchParams; // URLSearchParams type

  constructor(query: Query<any, any>, queryStr: URLSearchParams) {
    this.query = query;
    this.queryStr = queryStr;
  }

  searchAllFields(): this {
    const keyword = this.queryStr.get("keyword");

    // Check if the keyword is a valid ObjectId
    const orderId =
      !isNaN(keyword as unknown as number) && keyword && keyword.length <= 5;

    // Define the conditions to search for the keyword in title, description, and category
    const searchConditions = orderId
      ? { orderId: { $eq: parseInt(keyword) } } // Directly match _id if it's a valid ObjectId
      : {
          $or: [
            // Include condition to search by orderStatus
            { orderStatus: { $regex: keyword, $options: "i" } },
            {
              phone: { $regex: keyword, $options: "i" },
            }, // Filter by user's phone
            {
              email: { $regex: keyword, $options: "i" },
            }, // Filter by user's email
            {
              customerName: { $regex: keyword, $options: "i" },
            },
          ],
        };

    const tempConditions = keyword
      ? { $and: [this.query.getQuery(), searchConditions] }
      : this.query.getQuery(); // If no keyword, keep existing conditions

    // Set the conditions to this.query._conditions
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
    let prop = "";
    //Price Filter for gt> gte>= lt< lte<= in PRICE
    let output: Record<string, any> = {};
    for (let key in queryCopy) {
      if (!key.match(/\b(gt|gte|lt|lte)/)) {
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

export default APIOrderFilters;
