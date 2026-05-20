import React from "react";
import { IoMdPhonePortrait, IoMdAt, IoMdLocate } from "react-icons/io";

const IconListSectionComponent = ({
  mainTitle,
  textTitleOne,
  textTitleTwo,
  textTitleThree,
  textTwo,
  textThree,
  phoneLinkOne,
  phoneLinkTextOne,
  linkTwo,
  linkThree,
  linkTwoText,
  linkThreeText,
  textAddressThree,
  textAddressBThree,
  textAddressCThree,
}: {
  mainTitle: string;
  textTitleOne: string;
  textTitleTwo: string;
  textTitleThree: string;
  textTwo: string;
  textThree: string;
  phoneLinkOne: string;
  phoneLinkTextOne: string;
  linkTwo: string;
  linkThree: string;
  linkTwoText: string;
  linkThreeText: string;
  textAddressThree: string;
  textAddressBThree: string;
  textAddressCThree: string;
}) => {
  return (
    <div className="relative h-full">
      <div className="mt-0 flex flex-row maxmd:flex-col-reverse mx-auto my-14 w-[80%] maxmd:w-[100%] relative items-center">
        <div className="flex flex-col w-full">
          <h2 className="text-3xl font-base font-playfair-display mb-6">
            {mainTitle}
          </h2>

          <div className="flex flex-row gap-x-2 my-3">
            <div className="flex justify-center items-center w-[60px] h-[60px]  p-2 rounded-full">
              <IoMdAt className="w-[30px] h-[30px] " />
            </div>
            <div className="flex-col w-3/4">
              <div className="font-playfair-display text-2xl">
                {textTitleTwo}
              </div>
              <div className="text-xs">{textTwo}</div>
              <a href={linkTwo} className="text-xs font-bold">
                {linkTwoText}
              </a>
            </div>
          </div>

          {/* Warehouse 1 */}
          <div className="flex flex-row gap-x-2 mt-3">
            <div className="flex justify-center items-center w-[60px] h-[60px]  p-2 rounded-full">
              <IoMdLocate className="w-[30px] h-[30px] " />
            </div>
            <div className="flex-col w-3/4">
              <div className="font-playfair-display text-2xl">
                {textTitleThree}
              </div>
              <div className="text-xs">{textThree}</div>
              <div className="text-sm">
                <p>{textAddressThree}</p>
                <p>{textAddressBThree}</p>
                <p>{textAddressCThree}</p>
              </div>
              <a href={linkThree} target="_blank" className="text-xs font-bold">
                {linkThreeText}
              </a>
            </div>
          </div>
          {/* Call Us 1 */}
          <div className="flex flex-row gap-x-2 mb-3">
            <div className="flex justify-center items-center w-[60px] h-[60px] p-2 rounded-full">
              <IoMdPhonePortrait className="w-[30px] h-[30px]" />
            </div>
            <div className="flex-col flex gap-1 w-3/4 tracking-widest">
              <div className="font-playfair-display text-xl">
                {textTitleOne}
              </div>
              <a href={phoneLinkOne} className="text-xs font-bold">
                {phoneLinkTextOne}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconListSectionComponent;
