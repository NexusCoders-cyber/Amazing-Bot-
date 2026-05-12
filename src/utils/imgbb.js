import axios from 'axios';
import FormData from 'form-data';

export const IMGBB_API_KEY = '36568e232263f5502eb9ccca093bae84';

export async function uploadToImgBB(imageBuffer) {
    const formData = new FormData();
    formData.append('image', imageBuffer.toString('base64'));

    const res = await axios.post(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
        formData,
        { headers: formData.getHeaders(), timeout: 30000 }
    );

    const imageUrl = res?.data?.data?.url;
    if (!imageUrl) throw new Error('ImgBB upload failed');
    return imageUrl;
}
