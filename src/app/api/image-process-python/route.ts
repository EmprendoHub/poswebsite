import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

/**
 * API Route for Python-based image processing
 * Uses rembg and PIL for advanced background removal and optimization
 *
 * POST /api/image-process-python
 * Body: {
 *   image: File (base64 encoded or multipart)
 *   removeBackground: boolean
 *   optimizeForWeb: boolean
 * }
 */

export const runtime = "nodejs";

// Create a temporary directory for processing
const getTempDir = () => {
  const tempDir = path.join(process.cwd(), ".temp", "image-processing");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

// Create Python script for processing
const createPythonScript = (
  inputPath: string,
  outputPath: string,
  removeBackground: boolean,
  optimizeForWeb: boolean,
): string => {
  return `
import sys
sys.path.insert(0, '${process.cwd()}')

from PIL import Image
import numpy as np
import os

try:
    from rembg import remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False
    print("Warning: rembg not installed, background removal will be skipped")

def crop_to_content(image):
    """Remove transparent space around the actual image content"""
    img_array = np.array(image)
    
    # If no transparency, return as is
    if len(img_array.shape) == 2 or img_array.shape[2] == 3:
        return image
    
    if img_array.shape[2] != 4:
        return image
    
    alpha = img_array[:, :, 3]
    non_empty_rows = np.where(alpha.max(axis=1) > 0)[0]
    non_empty_columns = np.where(alpha.max(axis=0) > 0)[0]
    
    if len(non_empty_rows) == 0 or len(non_empty_columns) == 0:
        return image
    
    top = max(0, non_empty_rows.min() - 200)
    bottom = min(alpha.shape[0], non_empty_rows.max() + 200)
    left = non_empty_columns.min()
    right = non_empty_columns.max()
    
    # Ensure min height
    if bottom - top < 400:
        center = (top + bottom) // 2
        top = max(0, center - 200)
        bottom = min(alpha.shape[0], center + 200)
    
    cropBox = (left, top, right, bottom)
    return image.crop(cropBox)

def add_padding(image, desired_size=1080, add_white_bg=False):
    """Resize and pad image to desired square size"""
    old_size = image.size
    ratio = min(float(desired_size) / old_size[0], float(desired_size) / old_size[1])
    new_size = tuple([int(x * ratio) for x in old_size])
    image = image.resize(new_size, Image.LANCZOS)
    
    if add_white_bg:
        new_image = Image.new("RGBA", (desired_size, desired_size), (255, 255, 255, 255))
        new_image.paste(image, ((desired_size - new_size[0]) // 2,
                                (desired_size - new_size[1]) // 2), image)
    else:
        new_image = Image.new("RGBA", (desired_size, desired_size), (255, 255, 255, 0))
        new_image.paste(image, ((desired_size - new_size[0]) // 2,
                                (desired_size - new_size[1]) // 2))
    
    return new_image

def process_image(input_path, output_path, remove_bg=False, optimize=True):
    """Main processing function"""
    try:
        with Image.open(input_path) as img:
            # Convert to RGBA if needed
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Step 1: Remove background if requested
            if remove_bg and HAS_REMBG:
                img = remove(img)
            
            # Step 2: Crop to content
            img = crop_to_content(img)
            
            # Step 3: Resize and pad
            img = add_padding(img, desired_size=1080, add_white_bg=False)
            
            # Step 4: Save as PNG with optimization
            img.save(output_path, 'PNG', optimize=optimize)
            
            # Get file sizes for logging
            input_size = os.path.getsize(input_path) / 1024
            output_size = os.path.getsize(output_path) / 1024
            
            print(f"SUCCESS: Processed image from {{input_size:.2f}}KB to {{output_size:.2f}}KB")
            return True
            
    except Exception as e:
        print(f"ERROR: {{str(e)}}")
        return False

# Main execution
if __name__ == "__main__":
    remove_bg = ${removeBackground}
    optimize = ${optimizeForWeb}
    
    success = process_image("${inputPath}", "${outputPath}", remove_bg, optimize)
    sys.exit(0 if success else 1)
`;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;
    const removeBackground =
      (formData.get("removeBackground") as string) === "true";
    const optimizeForWeb =
      (formData.get("optimizeForWeb") as string) !== "false";

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Create temp directory
    const tempDir = getTempDir();
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input_${timestamp}.png`);
    const outputPath = path.join(tempDir, `output_${timestamp}.png`);
    const scriptPath = path.join(tempDir, `script_${timestamp}.py`);

    // Save uploaded file
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(buffer));

    // Create Python script
    const pythonScript = createPythonScript(
      inputPath,
      outputPath,
      removeBackground,
      optimizeForWeb,
    );
    fs.writeFileSync(scriptPath, pythonScript);

    // Execute Python script
    try {
      const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      console.log("Python output:", stdout);
      if (stderr) {
        console.warn("Python stderr:", stderr);
      }

      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        return NextResponse.json(
          { error: "Image processing failed" },
          { status: 500 },
        );
      }

      // Read processed image
      const processedBuffer = fs.readFileSync(outputPath);

      // Clean up temp files
      fs.unlinkSync(inputPath);
      fs.unlinkSync(scriptPath);
      fs.unlinkSync(outputPath);

      // Return processed image
      return new NextResponse(processedBuffer as any, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="processed_${timestamp}.png"`,
        },
      });
    } catch (execError: any) {
      console.error("Python execution error:", execError);

      // Clean up on error
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      return NextResponse.json(
        {
          error: "Image processing failed",
          details: execError.message || "Python script execution failed",
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error: "Processing error",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
