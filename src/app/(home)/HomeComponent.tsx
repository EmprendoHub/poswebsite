import React from "react";
import SectionOneComponent from "./_components/SectionOneComponent";
import SectionTwoComponent from "./_components/SectionTwoComponent";
import SectionFourComponent from "./_components/SectionFourComponent";
import MainHeroComponent from "./_components/MainHeroComponent";
import TestimonialComponent from "./_components/TestimonialComponent";
import HomeHeader from "./_components/HomeHeader";
import { getHomeProductsData } from "../_actions";
// import TrendingNewProducts from "./_components/TrendingNewProducts";
import HeaderProducts from "./_components/HeaderProducts";
import CategoryStack from "./_components/CategoryStack";

const HomeComponent = async () => {
  const data = await getHomeProductsData();
  // const trendProducts = JSON.parse(data.trendingProducts);
  const editorsProducts = JSON.parse(data.editorsProducts);
  return (
    <div className="w-full">
      <CategoryStack />
      <HomeHeader />
      <HeaderProducts editorsProducts={editorsProducts} />
      <MainHeroComponent />
      <SectionTwoComponent />
      <TestimonialComponent />
      <SectionFourComponent />
      <SectionOneComponent />
    </div>
  );
};

export default HomeComponent;
