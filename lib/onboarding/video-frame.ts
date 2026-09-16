export async function extractFirstFrameBase64(file: File): Promise<string> {
  const url = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      video.onloadeddata = () => {
        video.currentTime = Math.min(0.1, video.duration || 0.1);
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not process video frame."));
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          reject(new Error("Could not extract video frame."));
          return;
        }
        resolve(base64);
      };

      video.onerror = () => {
        reject(new Error("Could not read the selected video."));
      };
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
