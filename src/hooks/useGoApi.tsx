import axios from "axios";
import OpenAI from "openai";
import { useState } from "react";

export const useGoApi = () => {
  const [images, setImages] = useState<any[]>([]);

  const generateImage = async (prompt: string) => {
    try {
      const data = JSON.stringify({
        model: "midjourney",
        task_type: "imagine",
        input: {
          prompt,
          aspect_ratio: "16:9",
          process_mode: "fast",
          skip_prompt_check: false,
          bot_id: 0,
        },
        config: {
          service_mode: "",
          webhook_config: {
            endpoint: "",
            secret: "",
          },
        },
      });

      console.log("process.env.GO_API_AI_KEY", process.env.GO_API_AI_KEY);

      const config = {
        method: "post",
        url: "https://api.goapi.ai/api/v1/task",
        headers: {
          "x-api-key": process.env.GO_API_AI_KEY!,
          "Content-Type": "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
          console.log(error);
        });
    } catch (error) {
      console.log("error getting messages", error);
    }
  };

  const createFBPost = async (pageId: string, prompt: string) => {
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_KEY,
    });

    const aiPromptRequest = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Search Engine Optimization expert that writes engaging copy and generates an SEO-optimized title, description and social media post, for a websites blog called Super Collectibles MX, where they sell sports memorabilia and cartoons like pokemon, yu-gi-oh and card games like Magic.`,
        },
        {
          role: "user",
          content: `Generate a search engine optimized title, description and and social media post for the blog using the following concept: ${prompt}, all the copy should be in Spanish.`,
        },
      ],
      model: "gpt-3.5-turbo-0125",
    });

    if (aiPromptRequest.choices[0].message.content) {
      const responseJson = JSON.parse(
        aiPromptRequest.choices[0].message.content
      );

      const message = responseJson.social_summary;
      console.log("responseJson", responseJson);

      if (message) {
        const baseUrl = `https://graph.facebook.com/v21.0/${pageId}/photos`;
        const headers = {
          Authorization: `Bearer ${process.env.FB_API_TOKEN}`,
        };

        try {
          // generate post image with midjourney
          const postImage =
            "https://img.midjourneyapi.xyz/mj/28e5ba4b-46c0-4577-9950-e2efb3dbc670.png";

          const data = {
            message: message,
            published: true,
            url: postImage,
          };

          const response = await axios.post(baseUrl, data, { headers });

          if (response.status === 200) {
            console.log("Successfully created Facebook post:", response.data);
            return { status: 200, data: response.data };
          } else {
            console.error("Unexpected response status:", response.status);
            return { status: response.status, data: response.data };
          }
        } catch (error: any) {
          console.error(
            "Failed to respond to Facebook post:",
            error.response?.data || error.message
          );
          return { status: 400, error: error.response?.data || error.message };
        }
      }
    }
  };

  return {
    images,
    setImages,
    generateImage,
    createFBPost,
  };
};
