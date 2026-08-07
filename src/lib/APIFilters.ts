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
      // Check if keyword is in dimension format (e.g., "15×15×10" or "15x15x10")
      const isDimensionFormat = /^\d+\s*[×x]\s*\d+\s*[×x]\s*\d+$/.test(
        keyword.trim(),
      );

      if (isDimensionFormat) {
        // Parse dimensions string (format: length×width×height)
        const dimParts = keyword.split(/[×x]/).map((d) => parseFloat(d.trim()));
        if (dimParts.length === 3 && dimParts.every((d) => !isNaN(d))) {
          const [length, width, height] = dimParts;
          const tolerance = 0.5; // ±0.5cm tolerance

          // Create $or conditions for all 6 possible orientations
          const dimensionConditions = [
            // Exact orientation
            {
              "dimensions.length": {
                $gte: length - tolerance,
                $lte: length + tolerance,
              },
              "dimensions.width": {
                $gte: width - tolerance,
                $lte: width + tolerance,
              },
              "dimensions.height": {
                $gte: height - tolerance,
                $lte: height + tolerance,
              },
            },
            // Rotation 1: length x height x width
            {
              "dimensions.length": {
                $gte: length - tolerance,
                $lte: length + tolerance,
              },
              "dimensions.width": {
                $gte: height - tolerance,
                $lte: height + tolerance,
              },
              "dimensions.height": {
                $gte: width - tolerance,
                $lte: width + tolerance,
              },
            },
            // Rotation 2: width x length x height
            {
              "dimensions.length": {
                $gte: width - tolerance,
                $lte: width + tolerance,
              },
              "dimensions.width": {
                $gte: length - tolerance,
                $lte: length + tolerance,
              },
              "dimensions.height": {
                $gte: height - tolerance,
                $lte: height + tolerance,
              },
            },
            // Rotation 3: width x height x length
            {
              "dimensions.length": {
                $gte: width - tolerance,
                $lte: width + tolerance,
              },
              "dimensions.width": {
                $gte: height - tolerance,
                $lte: height + tolerance,
              },
              "dimensions.height": {
                $gte: length - tolerance,
                $lte: length + tolerance,
              },
            },
            // Rotation 4: height x length x width
            {
              "dimensions.length": {
                $gte: height - tolerance,
                $lte: height + tolerance,
              },
              "dimensions.width": {
                $gte: length - tolerance,
                $lte: length + tolerance,
              },
              "dimensions.height": {
                $gte: width - tolerance,
                $lte: width + tolerance,
              },
            },
            // Rotation 5: height x width x length
            {
              "dimensions.length": {
                $gte: height - tolerance,
                $lte: height + tolerance,
              },
              "dimensions.width": {
                $gte: width - tolerance,
                $lte: width + tolerance,
              },
              "dimensions.height": {
                $gte: length - tolerance,
                $lte: length + tolerance,
              },
            },
          ];

          const currentFilter = this.query.getFilter();
          const newFilter = {
            ...currentFilter,
            $or: dimensionConditions,
          };
          this.query = this.query.find(newFilter);
        }
      } else {
        // Regular keyword search
        const searchConditions = {
          $or: [
            { title: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
            { category: { $regex: keyword, $options: "i" } },
            { gender: { $regex: keyword, $options: "i" } },
            { brand: { $regex: keyword, $options: "i" } },
            { ASIN: { $regex: keyword, $options: "i" } },
          ],
        };

        const currentFilter = this.query.getFilter();
        const newFilter = { ...currentFilter, ...searchConditions };
        this.query = this.query.find(newFilter);
      }
    }

    return this;
  }

  filter(): this {
    const queryCopy: Record<string, string> = {};
    this.queryStr.forEach((value, key) => {
      if (
        ![
          "keyword",
          "page",
          "per_page",
          "perpage",
          "sortBy",
          "sortDir",
        ].includes(key)
      ) {
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
