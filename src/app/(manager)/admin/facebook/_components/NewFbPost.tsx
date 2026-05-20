"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createFBPost, subscribeToFbApp } from "@/app/_actions";

const NewFbPost = () => {
  //super collectibles fb page id

  const [prompt, setPrompt] = useState("");
  const pageId = "107551511895797";

  useEffect(() => {
    subscribeToFbApp(pageId);
  }, []);

  const handleSubmitNewPost = async (e: any) => {
    e.preventDefault();
    await createFBPost(pageId, prompt);
  };

  console.log(prompt);

  return (
    <div>
      <input type="text" onChange={(e) => setPrompt(e.target.value)} />{" "}
      <Button onClick={handleSubmitNewPost}>Generate</Button>
    </div>
  );
};

export default NewFbPost;
