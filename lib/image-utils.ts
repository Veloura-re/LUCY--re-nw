export async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Failed to fetch image for PDF:', response.statusText);
            return null;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert to base64
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        const base64 = btoa(binary);
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('Error converting image to base64:', error);
        return null;
    }
}
