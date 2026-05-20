import { cx } from "@/backend/helpers";
import Link from "next/link";
import React from "react";

// Define the props interface for the Tag component
interface TagProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  link: string;
  name: string;
}

const Tag: React.FC<TagProps> = ({
  link = "#",
  name,
  className, // Destructure className directly
  ...rest // Collect other props
}) => {
  return (
    <Link
      href={link}
      className={cx(
        "inline-block py-2 sm:py-3 px-6 sm:px-10 bg-dark text-light rounded-full capitalize font-semibold border-2 border-solid border-light hover:scale-105 transition-all ease duration-200 text-sm sm:text-base",
        className // Apply className here
      )}
      {...rest} // Spread the remaining props
    >
      {name}
    </Link>
  );
};

export default Tag;
