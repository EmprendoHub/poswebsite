import { createWorker } from "tesseract.js";

const convertor = async (img: string) => {
  const worker = await createWorker("eng");
  // Set Tesseract.js options
  const options: any = {
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", // Adjust based on needed characters
  };

  const ret = await worker.recognize(img, options);
  let text = ret.data.text;
  await worker.terminate();
  return text;
};

export default convertor;
