import React from "react";
import FilterOrdersComponent from "./FilterOrdersComponent";

const ReportsComponent = ({
  data,
  itemCount,
}: {
  data: any;
  itemCount: any;
}) => {
  return (
    <div>
      <FilterOrdersComponent data={data} itemCount={itemCount} />
    </div>
  );
};

export default ReportsComponent;
