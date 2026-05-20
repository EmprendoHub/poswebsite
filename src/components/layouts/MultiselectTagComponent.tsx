import React from "react";
import Select from "react-select";

const MultiselectTagComponent = ({
  options,
  handleAddTagField,
  values,
}: {
  options: any;
  handleAddTagField: any;
  values?: any;
}) => {
  return (
    <Select
      isMulti
      value={values}
      options={options}
      className="block appearance-none border border-gray-300 bg-input text-black rounded-xl focus:outline-none focus:border-gray-400 w-full"
      name="tags"
      placeholder="Etiquetas"
      onChange={handleAddTagField}
    />
  );
};

export default MultiselectTagComponent;
