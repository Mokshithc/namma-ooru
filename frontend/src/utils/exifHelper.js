import piexif from 'piexifjs';
import EXIF from 'exif-js';

/**
 * Convert GPS decimal degrees to EXIF format [degrees, minutes, seconds]
 */
const convertToExifGPS = (coordinate) => {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(seconds * 100), 100],
  ];
};

/**
 * Embed GPS and timestamp into image
 */

/**
 * Extract EXIF data from image
 */

/**
 * Convert base64 to File object
 */
export const base64ToFile = (base64String, filename = 'image.jpg') => {
  try {
    const byteString = atob(base64String.split(',')[1]);
    const mimeString = base64String.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    return new File([blob], filename, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error converting base64 to file:', error);
    throw error;
  }
};
